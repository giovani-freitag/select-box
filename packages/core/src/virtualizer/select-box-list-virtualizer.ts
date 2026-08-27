import {
    Virtualizer,
    elementScroll,
    observeElementOffset,
    observeElementRect,
    type VirtualItem,
    type VirtualizerOptions,
} from "@tanstack/virtual-core";

const DEFAULT_OVERSCAN = 3;

/**
 * Reports a row's height, from the resize entry when there is one.
 *
 * Rows are also measured by handing TanStack the element alone, and its own
 * default answers that call from its size cache — which leaves the list
 * re-rendering every frame for as long as the popover is open. Reading the
 * element is what the ref-style measurement means to ask for.
 *
 * A row measured before its first paint answers zero, and a zero is kept: the
 * row then occupies no space and drops out of the window for good. The
 * estimate stands in until a real height arrives.
 */
function measureRowHeight(
    element: HTMLElement,
    entry: ResizeObserverEntry | undefined,
    instance: Virtualizer<HTMLElement, HTMLElement>,
): number {
    const box = entry?.borderBoxSize?.[0];
    const measured = box ? Math.round(box.blockSize) : element.offsetHeight;
    if (measured > 0) return measured;
    return instance.options.estimateSize(instance.indexFromElement(element));
}

/**
 * Wraps TanStack's `observeElementRect` and forces a non-zero height: when the
 * underlying layout reports `height: 0` (notably under jsdom/happy-dom where
 * CSS layout doesn't run) the virtualizer can't decide which items intersect
 * the viewport and renders nothing. Falling back to the wrapper-supplied
 * viewport height preserves the visible window in those environments while
 * leaving production paths untouched.
 */
function createObserveElementRect(fallbackHeight: number) {
    return ((instance, cb) =>
        observeElementRect(instance, (rect) => {
            cb({
                width: rect.width,
                height: rect.height === 0 ? fallbackHeight : rect.height,
            });
        })) satisfies VirtualizerOptions<HTMLElement, HTMLElement>["observeElementRect"];
}

export interface SelectBoxListVirtualizerConfig {
    readonly getScrollElement: () => HTMLElement | null;
    readonly getCount: () => number;
    readonly estimateSize: (index: number) => number;
    readonly overscan?: number;
    /**
     * Viewport height assumed before TanStack's `ResizeObserver` produces a real
     * measurement. Used as `initialRect.height` so non-layout environments
     * (notably jsdom) still receive a populated visible window.
     */
    readonly initialViewportHeight?: number;
}

export type VirtualAlignment = "start" | "center" | "end" | "auto";

/**
 * Owns the TanStack {@link Virtualizer} lifecycle so wrappers only need to
 * provide a scroll-element accessor and the row count. Mount/update/dispose
 * are explicit so non-React wrappers (Lit, jQuery, plain web components) can
 * drive them without leaking a framework-specific effect system into core.
 */
export class SelectBoxListVirtualizer {
    private readonly virtualizer: Virtualizer<HTMLElement, HTMLElement>;
    private readonly listeners = new Set<() => void>();
    private cleanupMount: (() => void) | null = null;
    private deferredNotifyScheduled = false;
    private notifying = false;

    constructor(private readonly config: SelectBoxListVirtualizerConfig) {
        const fallbackViewport = config.initialViewportHeight;
        this.virtualizer = new Virtualizer<HTMLElement, HTMLElement>({
            count: config.getCount(),
            estimateSize: config.estimateSize,
            getScrollElement: config.getScrollElement,
            overscan: config.overscan ?? DEFAULT_OVERSCAN,
            observeElementRect:
                fallbackViewport !== undefined
                    ? createObserveElementRect(fallbackViewport)
                    : observeElementRect,
            observeElementOffset,
            measureElement: measureRowHeight,
            scrollToFn: elementScroll,
            onChange: (_instance, sync) => this.handleChange(sync),
            ...(fallbackViewport !== undefined
                ? { initialRect: { width: 0, height: fallbackViewport } }
                : {}),
        });
    }

    /**
     * Wires up scroll/resize observers. Must be called after the scroll element
     * is in the DOM.
     *
     * The re-entry guard is defensive and deliberately untested: TanStack's
     * `_didMount` is itself idempotent for the scroll listener and the
     * `ResizeObserver`, so removing the guard has no observable consequence to
     * assert against. It stays because that idempotence is not part of TanStack's
     * contract.
     */
    mount(): void {
        if (this.cleanupMount !== null) return;
        this.virtualizer._willUpdate();
        this.cleanupMount = this.virtualizer._didMount();
    }

    /**
     * Re-syncs the virtualizer with the current row count and re-resolves the
     * scroll element. Call AFTER the framework has committed the DOM —
     * otherwise `getScrollElement()` returns null and TanStack detaches its
     * resize/scroll observers (which would then never re-attach unless the
     * caller mounts/disposes the instance again).
     */
    sync(): void {
        this.syncCount();
        this.virtualizer._willUpdate();
    }

    /**
     * Pre-render count update — safe to call before the DOM commits because it
     * never touches scroll observers. Use this when the framework needs the
     * virtualizer's `getVirtualItems()` to reflect a new row count during
     * render (e.g. Lit's `willUpdate`), and pair it with a `sync()` call
     * post-commit (in `updated`) to bring the observers along.
     */
    syncCount(): void {
        const nextCount = this.config.getCount();
        if (this.virtualizer.options.count === nextCount) return;
        this.virtualizer.setOptions({
            ...this.virtualizer.options,
            count: nextCount,
        });
        // TanStack's `setOptions` assigns without emitting, so subscribers that
        // paint from `getVirtualItems()` would keep rendering the old window —
        // which truncates the list for any wrapper that repaints on notification
        // rather than on its own render pass.
        this.handleChange(true);
    }

    dispose(): void {
        this.cleanupMount?.();
        this.cleanupMount = null;
        this.listeners.clear();
    }

    /** Ref-style callback: pass each rendered row's element. Pass `null` when the row unmounts. */
    measureElement(node: HTMLElement | null): void {
        this.virtualizer.measureElement(node);
    }

    getVirtualItems(): ReadonlyArray<VirtualItem> {
        return this.virtualizer.getVirtualItems();
    }

    getTotalSize(): number {
        return this.virtualizer.getTotalSize();
    }

    /** Brings `index` inside the viewport via TanStack's internal scrollToFn. */
    scrollToIndex(index: number, align: VirtualAlignment = "auto"): void {
        this.virtualizer.scrollToIndex(index, { align });
    }

    subscribe(listener: () => void): () => void {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }

    /**
     * Reentrant calls (listener triggered another change) and async signals
     * (continuous scroll ticks, ResizeObserver) defer to a microtask so bursts
     * collapse into one paint per tick. Only TanStack's synchronous signals
     * fired outside a listener (programmatic scrollToIndex, count change)
     * paint immediately.
     */
    private handleChange(sync: boolean): void {
        if (sync && !this.notifying) {
            this.flushNotify();
            return;
        }
        this.scheduleDeferredFlush();
    }

    private scheduleDeferredFlush(): void {
        if (this.deferredNotifyScheduled) return;
        this.deferredNotifyScheduled = true;
        queueMicrotask(() => {
            this.deferredNotifyScheduled = false;
            this.flushNotify();
        });
    }

    private flushNotify(): void {
        this.notifying = true;
        try {
            for (const listener of this.listeners) listener();
        } finally {
            this.notifying = false;
        }
    }
}
