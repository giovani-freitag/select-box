import {
    SelectBoxListVirtualizer,
    SelectBoxRowModel,
    SingleSelectBoxController,
    TextHighlighter,
    type SelectBoxSnapshot,
    type SelectOption,
    type SingleSelectBoxControllerConfig,
} from "@select-box/core";

const ESTIMATED_OPTION_HEIGHT = 36;
const ESTIMATED_HEADER_HEIGHT = 28;
const LIST_VIEWPORT_HEIGHT = 240;

/**
 * Light-DOM select box view that wires a `SingleSelectBoxController` into a host element.
 */
export class SelectBoxView<TExtra extends object = object> {
    readonly root: HTMLDivElement;

    private readonly controller: SingleSelectBoxController<TExtra>;
    private readonly trigger: HTMLDivElement;
    private readonly input: HTMLInputElement;
    private readonly caret: HTMLButtonElement;
    private readonly popover: HTMLDivElement;
    private readonly list: HTMLDivElement;

    private unsubscribeFromStore: (() => void) | null = null;
    private previousValue: string | null = null;
    private readonly onValueChange:
        | ((value: string | null, option: SelectOption<TExtra> | null) => void)
        | undefined;
    private readonly placeholder: string;

    private readonly listVirtualizer: SelectBoxListVirtualizer;
    private rowModel: SelectBoxRowModel<TExtra> = new SelectBoxRowModel<TExtra>({ groups: [] });
    private lastRowModelSource: ReadonlyArray<unknown> | null = null;
    private unsubscribeFromVirtualizer: (() => void) | null = null;
    private lastScrolledActiveIndex = -1;
    private listInnerWrapper: HTMLDivElement | null = null;

    constructor(config: SingleSelectBoxControllerConfig<TExtra> & {
        readonly placeholder?: string;
        readonly onValueChange?: (value: string | null, option: SelectOption<TExtra> | null) => void;
    }) {
        this.controller = new SingleSelectBoxController<TExtra>(config);
        this.previousValue = this.controller.getState().value;
        this.placeholder = config.placeholder ?? "Select…";
        this.onValueChange = config.onValueChange;

        this.root = document.createElement("div");
        this.root.className = "select-box";
        this.root.dataset["selectRoot"] = "";

        this.trigger = this.createTrigger();
        this.input = this.trigger.querySelector<HTMLInputElement>(".select-box-input")!;
        this.caret = this.trigger.querySelector<HTMLButtonElement>(".select-box-caret")!;
        this.popover = this.createPopover();
        this.list = this.popover.querySelector<HTMLDivElement>(".select-box-list")!;

        this.root.append(this.trigger, this.popover);
        this.list.style.maxHeight = `${LIST_VIEWPORT_HEIGHT}px`;
        this.list.style.overflowY = "auto";
        this.listVirtualizer = new SelectBoxListVirtualizer({
            getScrollElement: () => this.list,
            getCount: () => this.rowModel.length,
            estimateSize: (index) => this.estimateRowSize(this.rowModel, index),
            initialViewportHeight: LIST_VIEWPORT_HEIGHT,
        });
        this.listVirtualizer.mount();
        this.unsubscribeFromVirtualizer = this.listVirtualizer.subscribe(this.handleSnapshotChange);
        this.listen();
        this.paint(this.controller.getState());
    }

    destroy(): void {
        this.unlisten();
        this.unsubscribeFromVirtualizer?.();
        this.unsubscribeFromVirtualizer = null;
        this.listVirtualizer.dispose();
        this.controller.destroy();
        this.root.remove();
    }

    getController(): SingleSelectBoxController<TExtra> {
        return this.controller;
    }

    open(): void {
        this.controller.open();
    }

    close(): void {
        this.controller.close();
    }

    toggle(): void {
        this.controller.toggle();
    }

    clear(): void {
        this.controller.clear();
    }

    private createTrigger(): HTMLDivElement {
        const trigger = document.createElement("div");
        trigger.className = "select-box-trigger";
        trigger.dataset["selectTrigger"] = "";

        const input = document.createElement("input");
        input.type = "text";
        input.className = "select-box-input";
        input.setAttribute("role", "combobox");
        input.setAttribute("aria-haspopup", "listbox");
        input.setAttribute("aria-autocomplete", "list");
        input.setAttribute("aria-expanded", "false");
        input.dataset["selectInput"] = "";

        const caret = document.createElement("button");
        caret.type = "button";
        caret.className = "select-box-caret";
        caret.tabIndex = -1;
        caret.setAttribute("aria-hidden", "true");
        caret.textContent = "▾";

        trigger.append(input, caret);
        return trigger;
    }

    private createPopover(): HTMLDivElement {
        const popover = document.createElement("div");
        popover.className = "select-box-popover";
        popover.setAttribute("role", "listbox");
        popover.dataset["selectPopover"] = "";
        popover.hidden = true;

        const list = document.createElement("div");
        list.className = "select-box-list";
        list.dataset["selectList"] = "";

        popover.append(list);
        return popover;
    }

    private listen(): void {
        this.unsubscribeFromStore = this.controller.subscribe(this.handleSnapshotChange);
        this.input.addEventListener("input", this.handleInputChange);
        this.input.addEventListener("focus", this.handleInputFocus);
        this.input.addEventListener("click", this.handleInputClick);
        this.input.addEventListener("keydown", this.handleInputKeyDown);
        this.caret.addEventListener("mousedown", this.handleCaretMouseDown);
        this.caret.addEventListener("click", this.handleCaretClick);
        document.addEventListener("mousedown", this.handleOutsideMouseDown);
    }

    private unlisten(): void {
        this.unsubscribeFromStore?.();
        this.unsubscribeFromStore = null;
        this.input.removeEventListener("input", this.handleInputChange);
        this.input.removeEventListener("focus", this.handleInputFocus);
        this.input.removeEventListener("click", this.handleInputClick);
        this.input.removeEventListener("keydown", this.handleInputKeyDown);
        this.caret.removeEventListener("mousedown", this.handleCaretMouseDown);
        this.caret.removeEventListener("click", this.handleCaretClick);
        document.removeEventListener("mousedown", this.handleOutsideMouseDown);
    }

    private readonly handleInputChange = (event: Event): void => {
        const input = event.currentTarget as HTMLInputElement;
        if (!this.controller.getState().open) this.controller.open();
        this.controller.setQuery(input.value);
    };

    private readonly handleInputFocus = (): void => {
        if (!this.controller.getState().open) this.controller.open();
    };

    private readonly handleInputClick = (): void => {
        if (!this.controller.getState().open) this.controller.open();
    };

    private readonly handleCaretMouseDown = (event: Event): void => {
        event.preventDefault();
    };

    private readonly handleCaretClick = (): void => {
        if (this.controller.getState().open) {
            this.controller.close();
        } else {
            this.controller.open();
            this.input.focus({ preventScroll: true });
        }
    };

    private readonly handleInputKeyDown = (event: KeyboardEvent): void => {
        if (event.key === "ArrowDown") {
            event.preventDefault();
            if (!this.controller.getState().open) this.controller.open();
            else this.controller.moveActive(1);
            return;
        }
        if (event.key === "ArrowUp") {
            event.preventDefault();
            this.controller.moveActive(-1);
            return;
        }
        if (event.key === "Enter") {
            event.preventDefault();
            this.controller.commitActive();
            return;
        }
        if (event.key === "Escape") {
            event.preventDefault();
            this.controller.close();
        }
    };

    private readonly handleOutsideMouseDown = (event: MouseEvent): void => {
        if (!this.controller.getState().open) return;
        if (!(event.target instanceof Node)) return;
        if (this.root.contains(event.target)) return;
        this.controller.close();
    };

    private readonly handleSnapshotChange = (): void => {
        const snapshot = this.controller.getState();
        this.paint(snapshot);
        if (snapshot.value !== this.previousValue) {
            this.previousValue = snapshot.value;
            this.onValueChange?.(snapshot.value, snapshot.selectedOption);
        }
    };

    private paint(snapshot: SelectBoxSnapshot<TExtra>): void {
        const inputValue = snapshot.open ? snapshot.query : (snapshot.selectedOption?.label ?? "");
        if (this.input.value !== inputValue) {
            this.input.value = inputValue;
        }
        this.input.placeholder = snapshot.open && snapshot.selectedOption
            ? snapshot.selectedOption.label
            : this.placeholder;
        this.input.setAttribute("aria-expanded", String(snapshot.open));

        this.popover.hidden = !snapshot.open;
        if (!snapshot.open) return;

        this.paintList(snapshot);
    }

    private paintList(snapshot: SelectBoxSnapshot<TExtra>): void {
        if (snapshot.filteredGroups !== this.lastRowModelSource) {
            this.rowModel = new SelectBoxRowModel<TExtra>({ groups: snapshot.filteredGroups });
            this.lastRowModelSource = snapshot.filteredGroups;
        }
        this.listVirtualizer.sync();

        if (snapshot.isEmpty) {
            const empty = document.createElement("p");
            empty.className = "select-box-empty";
            empty.dataset["selectEmpty"] = "";
            empty.textContent = "No matches";
            this.list.replaceChildren(empty);
            this.listInnerWrapper = null;
            return;
        }

        // Keep a stable inner wrapper anchored to `list` — never remove it
        // between paints. Wiping the list and re-appending mid-paint shrinks
        // `list.scrollHeight` to 0 and the browser clamps `scrollTop` to 0,
        // which manifests as a scroll-reset flicker every time the user drags.
        let wrapper = this.listInnerWrapper;
        if (wrapper === null || wrapper.parentNode !== this.list) {
            wrapper = document.createElement("div");
            this.list.replaceChildren(wrapper);
            this.listInnerWrapper = wrapper;
        }

        const items = this.listVirtualizer.getVirtualItems();
        const totalSize = this.listVirtualizer.getTotalSize();
        const paddingTop = items[0]?.start ?? 0;
        const paddingBottom = Math.max(0, totalSize - (items.at(-1)?.end ?? 0));
        const activeRowIndex = this.rowModel.findRowIndexForActiveIndex(snapshot.activeIndex);

        wrapper.style.paddingTop = `${paddingTop}px`;
        wrapper.style.paddingBottom = `${paddingBottom}px`;

        const renderedNodes: HTMLElement[] = [];
        for (const virtualRow of items) {
            const row = this.rowModel.getRowAt(virtualRow.index);
            if (row === undefined) continue;
            const node =
                row.kind === "header"
                    ? this.createHeaderElement(row.group.label)
                    : this.createOptionButton(row.option, virtualRow.index === activeRowIndex);
            node.dataset["index"] = String(virtualRow.index);
            renderedNodes.push(node);
        }

        // Atomic child swap on the same wrapper; total height is preserved
        // (padding compensates), so the browser doesn't reset scrollTop.
        wrapper.replaceChildren(...renderedNodes);

        for (const node of renderedNodes) {
            this.listVirtualizer.measureElement(node);
        }

        // Only scroll when the active row actually changed — otherwise every
        // scroll-driven repaint would yank the viewport back to the active
        // option, fighting the user's wheel/touch.
        if (activeRowIndex >= 0 && activeRowIndex !== this.lastScrolledActiveIndex) {
            this.lastScrolledActiveIndex = activeRowIndex;
            this.listVirtualizer.scrollToIndex(activeRowIndex, "auto");
        } else if (activeRowIndex < 0) {
            this.lastScrolledActiveIndex = -1;
        }
    }

    private createHeaderElement(label: string): HTMLDivElement {
        const header = document.createElement("div");
        header.className = "select-box-group-label";
        header.textContent = label;
        return header;
    }

    private createOptionButton(option: SelectOption<TExtra>, isActive: boolean): HTMLButtonElement {
        const button = document.createElement("button");
        button.type = "button";
        const classes = ["select-box-option"];
        if (isActive) classes.push("select-box-option-active");
        if (option.disabled) classes.push("select-box-option-disabled");
        button.className = classes.join(" ");
        button.dataset["selectOption"] = "";
        if (isActive) button.dataset["selectActive"] = "";
        if (option.disabled) button.disabled = true;
        button.append(...this.createLabelNodes(option.label));
        button.addEventListener("mousedown", (event) => event.preventDefault());
        button.addEventListener("click", () => this.controller.commitOption(option));
        return button;
    }

    private createLabelNodes(label: string): Node[] {
        const ranges = this.controller.getState().highlightRanges(label);
        return TextHighlighter.split(label, ranges).map((chunk) => {
            if (!chunk.matched) return document.createTextNode(chunk.text);
            const mark = document.createElement("mark");
            mark.className = "select-box-option-match";
            mark.textContent = chunk.text;
            return mark;
        });
    }

    private estimateRowSize(model: SelectBoxRowModel<TExtra>, index: number): number {
        return model.getRowAt(index)?.kind === "header"
            ? ESTIMATED_HEADER_HEIGHT
            : ESTIMATED_OPTION_HEIGHT;
    }
}
