/** Which side of the trigger the popover opens on. */
export type PopoverPlacement = "below" | "above";

/** The measurements the placement rule needs, in viewport coordinates. */
export interface PopoverPlacementInput {
    /** Distance from the top of the viewport to the top of the trigger. */
    readonly triggerTop: number;
    /** Distance from the top of the viewport to the bottom of the trigger. */
    readonly triggerBottom: number;
    /** The popover's own height, measured while it is on screen. */
    readonly popoverHeight: number;
    /** The visible height of the viewport. */
    readonly viewportHeight: number;
}

/**
 * Which side the popover should open on.
 *
 * Below is the default a native `<select>` sets, so it stands unless the list
 * genuinely does not fit there and the other side has more space to offer.
 *
 * @param input - Trigger and popover measurements in viewport coordinates.
 * @returns The side the popover should open on.
 */
export function resolvePopoverPlacement(input: PopoverPlacementInput): PopoverPlacement {
    const roomBelow = input.viewportHeight - input.triggerBottom;
    if (input.popoverHeight <= roomBelow) return "below";

    const roomAbove = input.triggerTop;
    return roomAbove > roomBelow ? "above" : "below";
}

/** Attribute the placement is published under, for the stylesheet to position by. */
const PLACEMENT_ATTRIBUTE = "data-select-placement";

export interface PopoverPlacementWatcherConfig {
    /** Resolves the component root, or null once the wrapper has torn it down. */
    readonly getRoot: () => HTMLElement | null;
}

interface ViewportHost {
    readonly innerHeight?: number;
    addEventListener?: (
        type: string,
        listener: () => void,
        options?: { passive: boolean; capture: boolean },
    ) => void;
    removeEventListener?: (
        type: string,
        listener: () => void,
        options?: { capture: boolean },
    ) => void;
}

/**
 * Keeps the open popover on whichever side of the trigger it fits.
 *
 * The rule is behaviour, so it lives here rather than five times over, and it
 * is published as an attribute the stylesheet positions by — where the popover
 * sits is still the stylesheet's business. Scroll and resize move the trigger
 * without any wrapper hearing about it, so the watcher listens for both while
 * the popover is open and for neither while it is closed.
 */
export class PopoverPlacementWatcher {
    private readonly config: PopoverPlacementWatcherConfig;
    private listening = false;

    constructor(config: PopoverPlacementWatcherConfig) {
        this.config = config;
    }

    /**
     * Re-places an open popover, and stands down once it closes.
     *
     * Call this after each paint: the popover has to be on screen before its
     * height means anything.
     *
     * @param open - Whether the popover is currently on screen.
     */
    sync(open: boolean): void {
        if (!open) {
            this.stopListening();
            return;
        }
        this.startListening();
        this.place();
    }

    /** Drops the listeners. Safe to call more than once. */
    dispose(): void {
        this.stopListening();
    }

    private readonly place = (): void => {
        const root = this.config.getRoot();
        const popover = root?.querySelector<HTMLElement>("[data-select-popover]");
        const trigger = root?.querySelector<HTMLElement>("[data-select-trigger]");
        if (!popover || !trigger) return;

        const viewportHeight = (globalThis as ViewportHost).innerHeight;
        if (viewportHeight === undefined) return;

        const triggerRect = trigger.getBoundingClientRect();
        const placement = resolvePopoverPlacement({
            triggerTop: triggerRect.top,
            triggerBottom: triggerRect.bottom,
            popoverHeight: popover.getBoundingClientRect().height,
            viewportHeight,
        });

        if (popover.getAttribute(PLACEMENT_ATTRIBUTE) === placement) return;
        popover.setAttribute(PLACEMENT_ATTRIBUTE, placement);
    };

    private startListening(): void {
        if (this.listening) return;
        const host = globalThis as ViewportHost;
        if (!host.addEventListener) return;
        // Capture, so a scroll inside any ancestor counts and not just the page.
        host.addEventListener("scroll", this.place, { passive: true, capture: true });
        host.addEventListener("resize", this.place, { passive: true, capture: false });
        this.listening = true;
    }

    private stopListening(): void {
        if (!this.listening) return;
        const host = globalThis as ViewportHost;
        host.removeEventListener?.("scroll", this.place, { capture: true });
        host.removeEventListener?.("resize", this.place, { capture: false });
        this.listening = false;
    }
}
