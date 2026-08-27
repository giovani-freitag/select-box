import {
    SelectBoxListVirtualizer,
    SelectBoxRowModel,
    type SelectBoxSnapshot,
    type SelectBoxSnapshotView,
    type SelectionValue,
} from "@select-box/core";

import type { SelectBoxNodeFactory } from "./select-box-node-factory.js";

const ESTIMATED_OPTION_HEIGHT = 36;
const ESTIMATED_HEADER_HEIGHT = 28;
const LIST_VIEWPORT_HEIGHT = 240;
const EMPTY_MESSAGE = "No matches";

/**
 * Config for {@link SelectBoxListPainter}.
 */
export interface SelectBoxListPainterConfig<TExtra extends object> {
    /** Builds the rows this painter puts in the list. */
    readonly factory: SelectBoxNodeFactory<TExtra>;
    /**
     * Resolves the scrollable list element. Read lazily on every paint so the
     * wrapper may create the painter before its markup exists.
     */
    readonly getListElement: () => HTMLElement | null;
    /**
     * Asks the wrapper to repaint because the visible window moved — a scroll,
     * a resize, or a row measurement.
     */
    readonly onWindowChange: () => void;
    /** Assumed list height before layout reports a real one. Defaults to 240. */
    readonly viewportHeight?: number;
    /** Row-height estimate for a group header. Defaults to 28. */
    readonly headerHeight?: number;
    /** Row-height estimate for an option. Defaults to 36. */
    readonly optionHeight?: number;
    /** Text for the empty state. Defaults to `"No matches"`. */
    readonly emptyMessage?: string;
    /**
     * Resolves the empty-state text at paint time.
     *
     * Read lazily, like `getListElement`, so a wrapper whose text comes from an
     * attribute can change it without rebuilding the painter. Takes precedence
     * over `emptyMessage` when it returns something.
     */
    readonly getEmptyMessage?: () => string | undefined;
}

/**
 * Paints the virtualized option list of a select box.
 *
 * Owns the row model and the virtualizer so a wrapper only has to say where the
 * list lives and when to repaint. Only the rows inside the visible window plus
 * the virtualizer's overscan ever reach the DOM, which is what keeps a
 * ten-thousand-option list responsive.
 */
export class SelectBoxListPainter<TExtra extends object = object> {
    private readonly factory: SelectBoxNodeFactory<TExtra>;
    private readonly getListElement: () => HTMLElement | null;
    private readonly onWindowChange: () => void;
    private readonly headerHeight: number;
    private readonly optionHeight: number;
    private readonly emptyMessage: string;
    private readonly getEmptyMessage: (() => string | undefined) | undefined;
    private readonly listViewportHeight: number;
    private readonly virtualizer: SelectBoxListVirtualizer;

    private rowModel: SelectBoxRowModel<TExtra> = new SelectBoxRowModel<TExtra>({
        groups: [],
    });
    private rowModelSource: ReadonlyArray<unknown> | null = null;
    private innerWrapper: HTMLDivElement | null = null;
    private scrolledActiveIndex = -1;
    private unsubscribe: (() => void) | null = null;

    constructor(config: SelectBoxListPainterConfig<TExtra>) {
        this.factory = config.factory;
        this.getListElement = config.getListElement;
        this.onWindowChange = config.onWindowChange;
        this.headerHeight = config.headerHeight ?? ESTIMATED_HEADER_HEIGHT;
        this.optionHeight = config.optionHeight ?? ESTIMATED_OPTION_HEIGHT;
        this.emptyMessage = config.emptyMessage ?? EMPTY_MESSAGE;
        this.getEmptyMessage = config.getEmptyMessage;
        this.listViewportHeight = config.viewportHeight ?? LIST_VIEWPORT_HEIGHT;
        this.virtualizer = new SelectBoxListVirtualizer({
            getScrollElement: this.getListElement,
            getCount: () => this.rowModel.length,
            estimateSize: (index) => this.estimateRowSize(index),
            initialViewportHeight: this.listViewportHeight,
        });
    }

    /**
     * Height to cap the list element at, in pixels.
     *
     * @returns The viewport height the virtualizer was configured with.
     */
    get viewportHeight(): number {
        return this.listViewportHeight;
    }

    /**
     * Attaches the scroll and resize observers.
     *
     * Call once the list element is in the document; before that the observers
     * have nothing to bind to and would never re-attach on their own.
     */
    mount(): void {
        this.virtualizer.mount();
        // Keeps the first unsubscriber: a second mount would otherwise strand it,
        // and only the identical listener reference makes that harmless today.
        this.unsubscribe ??= this.virtualizer.subscribe(this.onWindowChange);
    }

    /**
     * Releases the observers and forgets the painted DOM.
     */
    dispose(): void {
        this.unsubscribe?.();
        this.unsubscribe = null;
        this.virtualizer.dispose();
        this.innerWrapper = null;
        this.scrolledActiveIndex = -1;
    }

    /**
     * Repaints the list for the given snapshot.
     *
     * @param snapshot - Controller state to render.
     * @param view - Selection lookups derived from the same snapshot.
     */
    paint(
        snapshot: SelectBoxSnapshot<TExtra, SelectionValue>,
        view: SelectBoxSnapshotView<TExtra, SelectionValue>,
    ): void {
        const list = this.getListElement();
        if (list === null) return;

        this.syncRowModel(snapshot);
        this.virtualizer.sync();

        if (snapshot.isEmpty) {
            list.replaceChildren(
                this.factory.createEmptyState(this.getEmptyMessage?.() ?? this.emptyMessage),
            );
            this.innerWrapper = null;
            return;
        }

        const wrapper = this.resolveWrapper(list);
        const items = this.virtualizer.getVirtualItems();
        const activeRowIndex = this.rowModel.findRowIndexForActiveIndex(
            snapshot.activeIndex,
        );

        wrapper.style.paddingTop = `${items[0]?.start ?? 0}px`;
        wrapper.style.paddingBottom = `${Math.max(
            0,
            this.virtualizer.getTotalSize() - (items.at(-1)?.end ?? 0),
        )}px`;

        const rows: HTMLElement[] = [];
        // Rows that share a labelled group go inside one `role="group"`, so the
        // grouping a sighted reader sees is the grouping a screen reader hears.
        // A window can start mid-group, which is why the container is named from
        // the row's own group rather than from a header that may be scrolled out.
        const children: HTMLElement[] = [];
        let openGroup: { readonly index: number; readonly element: HTMLDivElement } | null = null;

        for (const virtualRow of items) {
            const row = this.rowModel.getRowAt(virtualRow.index);
            if (row === undefined) continue;
            const node =
                row.kind === "header"
                    ? this.factory.createGroupHeader(row.group.label)
                    : this.factory.createOptionRow(row.option, {
                          active: virtualRow.index === activeRowIndex,
                          selected: view.isSelected(row.option.value),
                      });
            // The virtualizer reads this back off the node when it measures, so
            // it has to be set before the element is handed over.
            node.dataset["index"] = String(virtualRow.index);
            rows.push(node);

            const sameRun =
                openGroup !== null && row.group.label !== "" && openGroup.index === row.groupIndex;
            if (!sameRun) {
                const container = this.factory.createGroupContainer(row.group.label);
                openGroup = { index: row.groupIndex, element: container };
                children.push(container);
            }
            openGroup!.element.append(node);
        }
        wrapper.replaceChildren(...children);
        for (const node of rows) this.virtualizer.measureElement(node);

        this.followActiveRow(activeRowIndex);
    }

    private syncRowModel(snapshot: SelectBoxSnapshot<TExtra, SelectionValue>): void {
        if (snapshot.filteredGroups === this.rowModelSource) return;
        this.rowModel = new SelectBoxRowModel<TExtra>({
            groups: snapshot.filteredGroups,
        });
        this.rowModelSource = snapshot.filteredGroups;
    }

    private resolveWrapper(list: HTMLElement): HTMLDivElement {
        const wrapper = this.innerWrapper;
        if (wrapper !== null && wrapper.parentNode === list) return wrapper;
        const created = document.createElement("div");
        list.replaceChildren(created);
        this.innerWrapper = created;
        return created;
    }

    private followActiveRow(activeRowIndex: number): void {
        if (activeRowIndex < 0) {
            this.scrolledActiveIndex = -1;
            return;
        }
        // Only chase the cursor when it actually moved; scrolling on every paint
        // would fight the user's own scrolling.
        if (activeRowIndex === this.scrolledActiveIndex) return;
        this.scrolledActiveIndex = activeRowIndex;
        this.virtualizer.scrollToIndex(activeRowIndex, "auto");
    }

    private estimateRowSize(index: number): number {
        return this.rowModel.getRowAt(index)?.kind === "header"
            ? this.headerHeight
            : this.optionHeight;
    }
}
