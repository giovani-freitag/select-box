import {
    SelectBoxController,
    SelectBoxKeyDispatcher,
    SelectBoxListVirtualizer,
    SelectBoxRowModel,
    SelectBoxSnapshotView,
    TextHighlighter,
    type SelectBoxControllerConfig,
    type SelectBoxSnapshot,
    type SelectionValue,
    type SelectOption,
} from "@select-box/core";

const ESTIMATED_OPTION_HEIGHT = 36;
const ESTIMATED_HEADER_HEIGHT = 28;
const LIST_VIEWPORT_HEIGHT = 240;

export type SelectBoxSurface = "popover" | "inline";

/**
 * Light-DOM select box view that wires a `SelectBoxController` into a host
 * element. Supports both single and multi modes via the config's `mode` flag,
 * and both `popover` and `inline` surfaces via the `surface` flag.
 */
export class SelectBoxView<TExtra extends object = object> {
    readonly root: HTMLDivElement;

    private readonly controller: SelectBoxController<TExtra, SelectionValue>;
    private readonly keyDispatcher: SelectBoxKeyDispatcher<TExtra, SelectionValue>;
    private readonly surface: SelectBoxSurface;
    private readonly trigger: HTMLDivElement | null;
    private readonly tagsContainer: HTMLDivElement | null;
    private readonly input: HTMLInputElement | null;
    private readonly caret: HTMLButtonElement | null;
    private readonly clearButton: HTMLButtonElement | null;
    private readonly popover: HTMLDivElement | null;
    private readonly list: HTMLDivElement | null;

    /** Live mode flag — reflects the controller's current selection mode. */
    private get multi(): boolean {
        return this.controller.mode === "multi";
    }

    /** Adds or removes the multi-mode marker on the root. */
    setMode(nextMode: "single" | "multi"): void {
        this.controller.setMode(nextMode);
    }

    private unsubscribeFromStore: (() => void) | null = null;
    private previousValueKey: string;
    private readonly onSingleChange:
        | ((value: string | null, option: SelectOption<TExtra> | null) => void)
        | undefined;
    private readonly onMultiChange:
        | ((
              values: ReadonlyArray<string>,
              options: ReadonlyArray<SelectOption<TExtra>>,
          ) => void)
        | undefined;
    private readonly placeholder: string;

    private readonly listVirtualizer: SelectBoxListVirtualizer | null;
    private rowModel: SelectBoxRowModel<TExtra> = new SelectBoxRowModel<TExtra>({ groups: [] });
    private lastRowModelSource: ReadonlyArray<unknown> | null = null;
    private unsubscribeFromVirtualizer: (() => void) | null = null;
    private lastScrolledActiveIndex = -1;
    private listInnerWrapper: HTMLDivElement | null = null;

    constructor(
        config: SelectBoxControllerConfig<TExtra> & {
            readonly placeholder?: string;
            readonly surface?: SelectBoxSurface;
            readonly onValueChange?: (
                value: string | null,
                option: SelectOption<TExtra> | null,
            ) => void;
            readonly onMultiValueChange?: (
                values: ReadonlyArray<string>,
                options: ReadonlyArray<SelectOption<TExtra>>,
            ) => void;
        },
    ) {
        this.controller = new SelectBoxController<TExtra, SelectionValue>(config);
        this.keyDispatcher = new SelectBoxKeyDispatcher(this.controller);
        this.previousValueKey = SelectBoxSnapshotView.valueKey(this.controller.getState().value);
        this.placeholder = config.placeholder ?? "Select…";
        this.onSingleChange = config.onValueChange;
        this.onMultiChange = config.onMultiValueChange;
        this.surface = config.surface ?? "popover";

        this.root = document.createElement("div");
        this.root.dataset["selectRoot"] = "";
        this.root.dataset["selectMode"] = this.multi ? "multi" : "single";
        this.root.className = this.computeRootClassName();
        if (this.surface === "inline") {
            this.root.dataset["selectSurface"] = "inline";
            this.root.setAttribute("role", "listbox");
            if (this.multi) this.root.setAttribute("aria-multiselectable", "true");
        }

        if (this.surface === "inline") {
            this.trigger = null;
            this.tagsContainer = null;
            this.input = null;
            this.caret = null;
            this.clearButton = null;
            this.popover = null;
            this.list = null;
            this.listVirtualizer = null;
            this.listen();
            this.paint(this.controller.getState());
            return;
        }

        this.trigger = this.createTrigger();
        this.tagsContainer = this.trigger.querySelector<HTMLDivElement>(".select-box-tags")!;
        this.input = this.trigger.querySelector<HTMLInputElement>(".select-box-input")!;
        this.caret = this.trigger.querySelector<HTMLButtonElement>(".select-box-caret")!;
        this.clearButton = this.trigger.querySelector<HTMLButtonElement>(".select-box-clear")!;
        this.popover = this.createPopover();
        this.list = this.popover.querySelector<HTMLDivElement>(".select-box-list")!;

        this.root.append(this.trigger, this.popover);
        this.list.style.maxHeight = `${LIST_VIEWPORT_HEIGHT}px`;
        this.list.style.overflowY = "auto";
        this.listVirtualizer = new SelectBoxListVirtualizer({
            getScrollElement: () => this.list!,
            getCount: () => this.rowModel.length,
            estimateSize: (index) => this.estimateRowSize(this.rowModel, index),
            initialViewportHeight: LIST_VIEWPORT_HEIGHT,
        });
        this.listVirtualizer.mount();
        this.unsubscribeFromVirtualizer = this.listVirtualizer.subscribe(this.handleSnapshotChange);
        this.listen();
        this.paint(this.controller.getState());
    }

    private computeRootClassName(): string {
        return [
            "select-box",
            this.surface === "inline" ? "select-box-inline" : null,
            this.multi ? "select-box-multi" : null,
        ]
            .filter((value): value is string => value !== null)
            .join(" ");
    }

    destroy(): void {
        this.unlisten();
        this.unsubscribeFromVirtualizer?.();
        this.unsubscribeFromVirtualizer = null;
        this.listVirtualizer?.dispose();
        this.controller.destroy();
        this.root.remove();
    }

    getController(): SelectBoxController<TExtra, SelectionValue> {
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

    /**
     * Replaces the option list, keeping whatever selection still applies.
     *
     * @param options - The new flat option list.
     */
    setOptions(options: ReadonlyArray<SelectOption<TExtra>>): void {
        this.controller.setOptions(options);
    }

    private createTrigger(): HTMLDivElement {
        const trigger = document.createElement("div");
        trigger.className = "select-box-trigger";
        trigger.dataset["selectTrigger"] = "";
        if (this.multi) {
            trigger.setAttribute("role", "combobox");
            trigger.setAttribute("aria-haspopup", "listbox");
            trigger.setAttribute("aria-expanded", "false");
        }

        const tags = document.createElement("div");
        tags.className = "select-box-tags";
        tags.dataset["selectTags"] = "";

        const input = document.createElement("input");
        input.type = "text";
        input.className = "select-box-input";
        input.setAttribute("role", this.multi ? "searchbox" : "combobox");
        if (!this.multi) {
            input.setAttribute("aria-haspopup", "listbox");
            input.setAttribute("aria-expanded", "false");
        }
        input.setAttribute("aria-autocomplete", "list");
        input.dataset["selectInput"] = "";

        tags.append(input);

        const caret = document.createElement("button");
        caret.type = "button";
        caret.className = "select-box-caret";
        caret.dataset["selectCaret"] = "";
        caret.tabIndex = -1;
        caret.setAttribute("aria-hidden", "true");
        caret.textContent = "▾";

        const clear = document.createElement("button");
        clear.type = "button";
        clear.className = "select-box-clear";
        clear.tabIndex = -1;
        clear.setAttribute("aria-label", "Clear all");
        clear.dataset["selectClear"] = "";
        clear.textContent = "×";

        trigger.append(tags, caret, clear);
        return trigger;
    }

    private createPopover(): HTMLDivElement {
        const popover = document.createElement("div");
        popover.className = "select-box-popover";
        popover.setAttribute("role", "listbox");
        if (this.multi) popover.setAttribute("aria-multiselectable", "true");
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
        if (this.surface === "inline") return;
        this.input!.addEventListener("input", this.handleInputChange);
        this.input!.addEventListener("focus", this.handleInputFocus);
        this.input!.addEventListener("click", this.handleInputClick);
        this.input!.addEventListener("keydown", this.handleInputKeyDown);
        this.caret!.addEventListener("mousedown", this.handleCaretMouseDown);
        this.caret!.addEventListener("click", this.handleCaretClick);
        // Always attach the multi-mode listeners; they self-gate on the
        // controller's current mode so the view reacts when mode flips at runtime.
        this.trigger!.addEventListener("mousedown", this.handleTriggerMouseDown);
        this.clearButton!.addEventListener("mousedown", this.handleClearMouseDown);
        this.clearButton!.addEventListener("click", this.handleClearClick);
        document.addEventListener("mousedown", this.handleOutsideMouseDown);
    }

    private unlisten(): void {
        this.unsubscribeFromStore?.();
        this.unsubscribeFromStore = null;
        if (this.surface === "inline") return;
        this.input?.removeEventListener("input", this.handleInputChange);
        this.input?.removeEventListener("focus", this.handleInputFocus);
        this.input?.removeEventListener("click", this.handleInputClick);
        this.input?.removeEventListener("keydown", this.handleInputKeyDown);
        this.caret?.removeEventListener("mousedown", this.handleCaretMouseDown);
        this.caret?.removeEventListener("click", this.handleCaretClick);
        this.trigger?.removeEventListener("mousedown", this.handleTriggerMouseDown);
        this.clearButton?.removeEventListener("mousedown", this.handleClearMouseDown);
        this.clearButton?.removeEventListener("click", this.handleClearClick);
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
            this.input?.focus({ preventScroll: true });
        }
    };

    private readonly handleTriggerMouseDown = (event: MouseEvent): void => {
        if (this.controller.getState().mode !== "multi") return;
        if (event.target === this.input) return;
        if (event.target instanceof Element &&
            event.target.closest("[data-select-chip-remove], [data-select-clear]")) return;
        event.preventDefault();
        if (!this.controller.getState().open) this.controller.open();
        this.input?.focus({ preventScroll: true });
    };

    private readonly handleClearMouseDown = (event: Event): void => {
        if (this.controller.getState().mode !== "multi") return;
        event.preventDefault();
        event.stopPropagation();
    };

    private readonly handleClearClick = (event: Event): void => {
        if (this.controller.getState().mode !== "multi") return;
        event.stopPropagation();
        this.controller.clear();
        this.input?.focus({ preventScroll: true });
    };

    private readonly handleInputKeyDown = (event: KeyboardEvent): void => {
        if (this.keyDispatcher.dispatch(event.key) === "handled") {
            event.preventDefault();
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
        const currentKey = SelectBoxSnapshotView.valueKey(snapshot.value);
        if (currentKey !== this.previousValueKey) {
            this.previousValueKey = currentKey;
            if (snapshot.mode === "multi") {
                this.onMultiChange?.(
                    snapshot.value as ReadonlyArray<string>,
                    snapshot.selectedOptions,
                );
            } else {
                this.onSingleChange?.(
                    snapshot.value as string | null,
                    snapshot.selectedOption,
                );
            }
        }
    };

    private paint(snapshot: SelectBoxSnapshot<TExtra, SelectionValue>): void {
        const view = new SelectBoxSnapshotView(snapshot);
        const isMulti = snapshot.mode === "multi";

        // Keep host-level mode markers in sync so consumer CSS can branch on them.
        if (isMulti) {
            this.root.classList.add("select-box-multi");
        } else {
            this.root.classList.remove("select-box-multi");
        }
        this.root.dataset["selectMode"] = snapshot.mode;

        if (this.surface === "inline") {
            this.paintInline(snapshot, view, isMulti);
            return;
        }

        this.setTriggerButtonPresent(this.caret!, !isMulti);
        if (isMulti) this.popover!.setAttribute("aria-multiselectable", "true");
        else this.popover!.removeAttribute("aria-multiselectable");

        const inputValue = view.triggerInputValue;
        if (this.input!.value !== inputValue) {
            this.input!.value = inputValue;
        }
        const hasSelection = snapshot.selectedOptions.length > 0;
        this.input!.placeholder = isMulti
            ? (hasSelection ? "" : this.placeholder)
            : (snapshot.open && snapshot.selectedOption
                ? snapshot.selectedOption.label
                : this.placeholder);

        if (isMulti) {
            this.trigger!.setAttribute("aria-expanded", String(snapshot.open));
        } else {
            this.input!.setAttribute("aria-expanded", String(snapshot.open));
        }

        this.paintChips(snapshot, isMulti);
        this.setTriggerButtonPresent(this.clearButton!, isMulti && hasSelection);

        this.popover!.hidden = !snapshot.open;
        if (!snapshot.open) return;

        this.paintList(snapshot, view, isMulti);
    }

    /**
     * Attaches or detaches one of the trigger's trailing buttons.
     *
     * Presence in the tree, not the `hidden` attribute, is what drives
     * visibility here: `hidden` resolves to `display: none` only through the
     * user-agent stylesheet, so any consumer rule setting `display` on the
     * same element silently outranks it.
     */
    private setTriggerButtonPresent(button: HTMLButtonElement, present: boolean): void {
        if (present === (button.parentNode === this.trigger)) return;
        if (present) this.trigger!.append(button);
        else button.remove();
    }

    /** Inline-surface paint: every option is a toggleable chip rendered directly
     * into the root container. No popover, no input, no virtualizer — just the
     * chip grid that mirrors the docs-starlight light-DOM `.select-box-inline`. */
    private paintInline(
        snapshot: SelectBoxSnapshot<TExtra, SelectionValue>,
        view: SelectBoxSnapshotView<TExtra, SelectionValue>,
        isMulti: boolean,
    ): void {
        if (isMulti) this.root.setAttribute("aria-multiselectable", "true");
        else this.root.removeAttribute("aria-multiselectable");
        this.root.replaceChildren();
        for (const group of snapshot.filteredGroups) {
            if (group.label !== "") {
                this.root.appendChild(this.createHeaderElement(group.label));
            }
            const tags = document.createElement("div");
            tags.className = "select-box-tags";
            tags.dataset["selectTags"] = "";
            for (const option of group.options) {
                tags.appendChild(
                    this.createInlineChipButton(option, view.isSelected(option.value)),
                );
            }
            this.root.appendChild(tags);
        }
    }

    private createInlineChipButton(
        option: SelectOption<TExtra>,
        isSelected: boolean,
    ): HTMLButtonElement {
        const button = document.createElement("button");
        button.type = "button";
        button.setAttribute("role", "option");
        button.setAttribute("aria-selected", String(isSelected));
        button.setAttribute("aria-pressed", String(isSelected));
        const classes = ["select-box-chip", "select-box-chip-selectable"];
        if (isSelected) classes.push("select-box-chip-selected");
        if (option.disabled) classes.push("select-box-chip-disabled");
        button.className = classes.join(" ");
        button.dataset["selectChip"] = "";
        button.dataset["selectOption"] = "";
        if (isSelected) button.dataset["selectSelected"] = "";
        if (option.disabled) button.disabled = true;
        button.textContent = option.label;
        button.addEventListener("click", () => {
            if (option.disabled) return;
            this.controller.commitOption(option);
        });
        return button;
    }

    private paintChips(
        snapshot: SelectBoxSnapshot<TExtra, SelectionValue>,
        isMulti: boolean,
    ): void {
        // Popover-only path — guarded by `paint`; references safe here.
        const tagsContainer = this.tagsContainer!;
        const input = this.input!;
        const existingChips = tagsContainer.querySelectorAll<HTMLSpanElement>(
            ".select-box-chip",
        );
        existingChips.forEach((chip) => chip.remove());
        if (!isMulti) return;
        const fragment = document.createDocumentFragment();
        for (const option of snapshot.selectedOptions) {
            fragment.appendChild(this.createChipElement(option));
        }
        tagsContainer.insertBefore(fragment, input);
    }

    private createChipElement(option: SelectOption<TExtra>): HTMLSpanElement {
        const chip = document.createElement("span");
        chip.className = "select-box-chip";
        chip.dataset["selectChip"] = "";
        chip.append(document.createTextNode(option.label));
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "select-box-chip-remove";
        remove.setAttribute("aria-label", `Remove ${option.label}`);
        remove.dataset["selectChipRemove"] = "";
        remove.textContent = "×";
        remove.addEventListener("mousedown", (event) => event.stopPropagation());
        remove.addEventListener("click", (event) => {
            event.stopPropagation();
            this.controller.commitOption(option);
            // Popover-multi-only path — `this.input` exists when surface !== "inline".
            this.input?.focus({ preventScroll: true });
        });
        chip.append(remove);
        return chip;
    }

    private paintList(
        snapshot: SelectBoxSnapshot<TExtra, SelectionValue>,
        view: SelectBoxSnapshotView<TExtra, SelectionValue>,
        isMulti: boolean,
    ): void {
        // Popover-only path — surface guard in `paint` prevents this from
        // being called in inline mode, so the non-null assertions are safe.
        const list = this.list!;
        const listVirtualizer = this.listVirtualizer!;
        if (snapshot.filteredGroups !== this.lastRowModelSource) {
            this.rowModel = new SelectBoxRowModel<TExtra>({ groups: snapshot.filteredGroups });
            this.lastRowModelSource = snapshot.filteredGroups;
        }
        listVirtualizer.sync();

        if (snapshot.isEmpty) {
            const empty = document.createElement("p");
            empty.className = "select-box-empty";
            empty.dataset["selectEmpty"] = "";
            empty.textContent = "No matches";
            list.replaceChildren(empty);
            this.listInnerWrapper = null;
            return;
        }

        let wrapper = this.listInnerWrapper;
        if (wrapper === null || wrapper.parentNode !== list) {
            wrapper = document.createElement("div");
            list.replaceChildren(wrapper);
            this.listInnerWrapper = wrapper;
        }

        const items = listVirtualizer.getVirtualItems();
        const totalSize = listVirtualizer.getTotalSize();
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
                    : this.createOptionButton(
                          row.option,
                          virtualRow.index === activeRowIndex,
                          view.isSelected(row.option.value),
                          isMulti,
                      );
            node.dataset["index"] = String(virtualRow.index);
            renderedNodes.push(node);
        }

        wrapper.replaceChildren(...renderedNodes);

        for (const node of renderedNodes) {
            listVirtualizer.measureElement(node);
        }

        if (activeRowIndex >= 0 && activeRowIndex !== this.lastScrolledActiveIndex) {
            this.lastScrolledActiveIndex = activeRowIndex;
            listVirtualizer.scrollToIndex(activeRowIndex, "auto");
        } else if (activeRowIndex < 0) {
            this.lastScrolledActiveIndex = -1;
        }
    }

    private createHeaderElement(label: string): HTMLDivElement {
        const header = document.createElement("div");
        header.className = "select-box-group-label";
        header.dataset["selectGroupLabel"] = "";
        header.textContent = label;
        return header;
    }

    private createOptionButton(
        option: SelectOption<TExtra>,
        isActive: boolean,
        isSelected: boolean,
        isMulti: boolean,
    ): HTMLButtonElement {
        const button = document.createElement("button");
        button.type = "button";
        button.setAttribute("role", "option");
        button.setAttribute("aria-selected", String(isSelected));
        const classes = ["select-box-option"];
        if (isActive) classes.push("select-box-option-active");
        if (isSelected && isMulti) classes.push("select-box-option-selected");
        if (option.disabled) classes.push("select-box-option-disabled");
        button.className = classes.join(" ");
        button.tabIndex = -1;
        button.dataset["selectOption"] = "";
        if (isActive) button.dataset["selectActive"] = "";
        if (isSelected) button.dataset["selectSelected"] = "";
        if (option.disabled) button.disabled = true;
        if (isMulti) {
            const tick = document.createElement("span");
            tick.className = "select-box-option-tick";
            tick.setAttribute("aria-hidden", "true");
            tick.textContent = isSelected ? "✓" : "";
            button.append(tick);
        }
        button.append(...this.createLabelNodes(option.label));
        button.addEventListener("mousedown", (event) => event.preventDefault());
        button.addEventListener("click", () => {
            this.controller.commitOption(option);
            // Popover-only path — `this.input` exists when surface !== "inline".
            if (isMulti) this.input?.focus({ preventScroll: true });
        });
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
