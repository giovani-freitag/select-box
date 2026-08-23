import {
    SelectBoxController,
    SelectBoxKeyDispatcher,
    SelectBoxListVirtualizer,
    SelectBoxRowModel,
    SelectBoxSnapshotView,
    TextHighlighter,
    isMultiSelection,
    type OptionFilterStrategy,
    type SelectBoxAddon,
    type SelectBoxSnapshot,
    type SelectionValue,
    type SelectionValueInput,
    type SelectOption,
} from "@select-box/core";

import { encodeFormValue, parseFormState, type FormStateValue } from "./form-state.js";
import { renderSelectBox, type SelectBoxRefs } from "./render.js";

const OBSERVED_ATTRIBUTES = [
    "placeholder",
    "ungrouped-label",
    "name",
    "disabled",
    "required",
    "readonly",
    "multi",
    "surface",
] as const;
const ESTIMATED_OPTION_HEIGHT = 36;
const ESTIMATED_HEADER_HEIGHT = 28;
const LIST_VIEWPORT_HEIGHT = 240;

/**
 * Form-associated `<select-box>` custom element backed by the unified
 * `SelectBoxController`. Set the `multi` attribute (or property) to switch
 * to multi-select semantics — chips render inside the trigger, the popover
 * stays open across commits, and the form value submits as multiple entries.
 */
export class SelectBoxElement<TExtra extends object = object> extends HTMLElement {
    static get observedAttributes(): ReadonlyArray<string> {
        return OBSERVED_ATTRIBUTES;
    }

    static readonly formAssociated = true;

    private readonly internals: ElementInternals;

    private coreController: SelectBoxController<TExtra, SelectionValue> | null = null;
    private keyDispatcher: SelectBoxKeyDispatcher<TExtra, SelectionValue> | null = null;
    private unsubscribeFromStore: (() => void) | null = null;
    private refs: SelectBoxRefs | null = null;
    private previousValueKey: string = SelectBoxSnapshotView.valueKey(null);

    private listVirtualizer: SelectBoxListVirtualizer | null = null;
    private rowModel: SelectBoxRowModel<TExtra> = new SelectBoxRowModel<TExtra>({ groups: [] });
    private lastRowModelSource: ReadonlyArray<unknown> | null = null;
    private unsubscribeFromVirtualizer: (() => void) | null = null;
    private lastScrolledActiveIndex = -1;
    private listInnerWrapper: HTMLDivElement | null = null;

    private pendingOptions: ReadonlyArray<SelectOption<TExtra>> | undefined;
    private pendingAddons: ReadonlyArray<SelectBoxAddon<TExtra>> | undefined;
    private pendingFilter: OptionFilterStrategy<TExtra> | undefined;
    private pendingValue: SelectionValueInput = null;

    constructor() {
        super();
        this.internals = this.attachInternals();
    }

    connectedCallback(): void {
        // The host is this wrapper's root node, so it carries the root hook the
        // DOM-tree wrappers put on their outermost div.
        this.dataset["selectRoot"] = "";
        // Same root class the DOM-tree wrappers put on their outermost div, so a
        // single stylesheet reaches all five.
        this.classList.add("select-box");
        this.refs = renderSelectBox(this);
        this.refs.list.style.maxHeight = `${LIST_VIEWPORT_HEIGHT}px`;
        this.refs.list.style.overflowY = "auto";
        this.applyModeAttribute();
        this.coreController = this.buildController();
        this.keyDispatcher = new SelectBoxKeyDispatcher(this.coreController);
        this.listVirtualizer = new SelectBoxListVirtualizer({
            getScrollElement: () => this.refs?.list ?? null,
            getCount: () => this.rowModel.length,
            estimateSize: (index) => this.estimateRowSize(this.rowModel, index),
            initialViewportHeight: LIST_VIEWPORT_HEIGHT,
        });
        this.listVirtualizer.mount();
        this.unsubscribeFromVirtualizer = this.listVirtualizer.subscribe(this.handleSnapshotChange);
        this.previousValueKey = SelectBoxSnapshotView.valueKey(this.coreController.getState().value);
        this.listen();
        this.handleSnapshotChange();
    }

    disconnectedCallback(): void {
        this.unlisten();
        this.coreController?.destroy();
        this.coreController = null;
        this.keyDispatcher = null;
        this.refs = null;
        this.unsubscribeFromVirtualizer?.();
        this.unsubscribeFromVirtualizer = null;
        this.listVirtualizer?.dispose();
        this.listVirtualizer = null;
    }

    attributeChangedCallback(name: string, _previous: string | null, _next: string | null): void {
        if (!this.refs) return;
        if (name === "placeholder" || name === "ungrouped-label") {
            this.handleSnapshotChange();
            return;
        }
        if (name === "multi") {
            this.applyModeAttribute();
            this.applyModeToController();
            return;
        }
        if (name === "surface") {
            this.handleSnapshotChange();
            return;
        }
        if (name === "disabled" || name === "required" || name === "readonly") {
            this.syncValidity();
            this.handleSnapshotChange();
        }
    }

    /**
     * Flips the controller's mode in place — preserves the current selection
     * via the driver's coerce step (single→multi wraps as singleton, multi→
     * single keeps the first option), instead of throwing the controller away.
     */
    private applyModeToController(): void {
        if (!this.coreController) return;
        const nextMode = this.multi ? "multi" : "single";
        if (this.coreController.mode === nextMode) return;
        this.coreController.setMode(nextMode);
    }

    /**
     * Root element of the rendered select box.
     *
     * Same accessor name every wrapper exposes, so consumer code that reaches
     * for the root reads the same across frameworks.
     */
    get root(): HTMLElement {
        return this;
    }

    /**
     * Core controller driving this instance, or null before it is connected.
     *
     * Escape hatch for behaviour the props and attributes do not cover; the
     * same accessor name every wrapper exposes.
     */
    get controller(): SelectBoxController<TExtra, SelectionValue> | null {
        return this.coreController;
    }

    get form(): HTMLFormElement | null {
        return this.internals.form;
    }

    get name(): string {
        return this.getAttribute("name") ?? "";
    }

    set name(next: string) {
        this.setAttribute("name", next);
    }

    get type(): string {
        return "select-box";
    }

    get disabled(): boolean {
        return this.hasAttribute("disabled");
    }

    set disabled(next: boolean) {
        if (next) this.setAttribute("disabled", "");
        else this.removeAttribute("disabled");
    }

    get required(): boolean {
        return this.hasAttribute("required");
    }

    set required(next: boolean) {
        if (next) this.setAttribute("required", "");
        else this.removeAttribute("required");
    }

    get readOnly(): boolean {
        return this.hasAttribute("readonly");
    }

    set readOnly(next: boolean) {
        if (next) this.setAttribute("readonly", "");
        else this.removeAttribute("readonly");
    }

    get multi(): boolean {
        return this.hasAttribute("multi");
    }

    set multi(next: boolean) {
        if (next) this.setAttribute("multi", "");
        else this.removeAttribute("multi");
    }

    get surface(): "popover" | "inline" {
        return this.getAttribute("surface") === "inline" ? "inline" : "popover";
    }

    set surface(next: "popover" | "inline") {
        if (next === "inline") this.setAttribute("surface", "inline");
        else this.removeAttribute("surface");
    }

    private get isInline(): boolean {
        return this.surface === "inline";
    }

    get validity(): ValidityState {
        return this.internals.validity;
    }

    get validationMessage(): string {
        return this.internals.validationMessage;
    }

    get willValidate(): boolean {
        return this.internals.willValidate;
    }

    checkValidity(): boolean {
        return this.internals.checkValidity();
    }

    reportValidity(): boolean {
        return this.internals.reportValidity();
    }

    setCustomValidity(message: string): void {
        if (message === "") {
            this.syncValidity();
            return;
        }
        this.internals.setValidity({ customError: true }, message);
    }

    get labels(): NodeList {
        return this.internals.labels;
    }

    formResetCallback(): void {
        this.coreController?.clear();
        this.pendingValue = null;
    }

    formDisabledCallback(disabled: boolean): void {
        if (disabled) this.setAttribute("disabled", "");
        else this.removeAttribute("disabled");
    }

    formStateRestoreCallback(state: FormStateValue, _mode: "restore" | "autocomplete"): void {
        this.pendingValue = parseFormState(state);
        this.rebuildControllerIfConnected();
    }

    get options(): ReadonlyArray<SelectOption<TExtra>> | undefined {
        return this.pendingOptions;
    }
    set options(next: ReadonlyArray<SelectOption<TExtra>> | undefined) {
        this.pendingOptions = next;
        // A live controller swaps its list in place, the way a native select
        // reacts to its `<option>` children changing. Rebuilding would throw the
        // committed selection away.
        if (this.coreController) this.coreController.setOptions(next ?? []);
        else this.rebuildControllerIfConnected();
    }

    get value(): SelectionValue {
        const snapshot = this.coreController?.getState();
        if (snapshot) return snapshot.value;
        return this.multi ? [] : null;
    }
    set value(next: SelectionValueInput) {
        this.pendingValue = next;
        this.rebuildControllerIfConnected();
    }

    /** First selected option (or `null`). Same as the snapshot field. */
    get selectedOption(): SelectOption<TExtra> | null {
        return this.coreController?.getState().selectedOption ?? null;
    }

    /** Every selected option. Length 0 or 1 in single mode. */
    get selectedOptions(): ReadonlyArray<SelectOption<TExtra>> {
        return this.coreController?.getState().selectedOptions ?? [];
    }

    get addons(): ReadonlyArray<SelectBoxAddon<TExtra>> | undefined {
        return this.pendingAddons;
    }
    set addons(next: ReadonlyArray<SelectBoxAddon<TExtra>> | undefined) {
        this.pendingAddons = next;
        this.rebuildControllerIfConnected();
    }

    get filter(): OptionFilterStrategy<TExtra> | undefined {
        return this.pendingFilter;
    }
    set filter(next: OptionFilterStrategy<TExtra> | undefined) {
        this.pendingFilter = next;
        if (this.coreController !== null && next !== undefined) {
            this.coreController.setFilter(next);
            return;
        }
        this.rebuildControllerIfConnected();
    }

    private applyModeAttribute(): void {
        const mode = this.multi ? "multi" : "single";
        if (this.getAttribute("mode") !== mode) this.setAttribute("mode", mode);
    }

    private buildController(): SelectBoxController<TExtra, SelectionValue> {
        return new SelectBoxController<TExtra, SelectionValue>({
            mode: this.multi ? "multi" : "single",
            ...(this.pendingOptions !== undefined ? { options: this.pendingOptions } : {}),
            ...(this.pendingAddons !== undefined ? { addons: this.pendingAddons } : {}),
            ...(this.pendingFilter !== undefined ? { filter: this.pendingFilter } : {}),
            ungroupedLabel: this.getAttribute("ungrouped-label") ?? "",
            initialValue: this.pendingValue,
        });
    }

    private rebuildControllerIfConnected(): void {
        if (!this.isConnected || !this.refs) return;
        this.unlisten();
        this.coreController?.destroy();
        this.coreController = this.buildController();
        this.keyDispatcher = new SelectBoxKeyDispatcher(this.coreController);
        this.previousValueKey = SelectBoxSnapshotView.valueKey(this.coreController.getState().value);
        this.listen();
        this.handleSnapshotChange();
    }

    private listen(): void {
        if (!this.refs || !this.coreController) return;
        this.unsubscribeFromStore = this.coreController.subscribe(this.handleSnapshotChange);
        this.refs.input.addEventListener("input", this.handleInputChange);
        this.refs.input.addEventListener("focus", this.handleInputFocus);
        this.refs.input.addEventListener("click", this.handleInputClick);
        this.refs.input.addEventListener("keydown", this.handleInputKeyDown);
        this.refs.caret.addEventListener("mousedown", this.handleCaretMouseDown);
        this.refs.caret.addEventListener("click", this.handleCaretClick);
        this.refs.trigger.addEventListener("mousedown", this.handleTriggerMouseDown);
        this.refs.clearButton.addEventListener("mousedown", this.handleClearMouseDown);
        this.refs.clearButton.addEventListener("click", this.handleClearClick);
        document.addEventListener("mousedown", this.handleOutsideMouseDown);
    }

    private unlisten(): void {
        this.unsubscribeFromStore?.();
        this.unsubscribeFromStore = null;
        this.refs?.input.removeEventListener("input", this.handleInputChange);
        this.refs?.input.removeEventListener("focus", this.handleInputFocus);
        this.refs?.input.removeEventListener("click", this.handleInputClick);
        this.refs?.input.removeEventListener("keydown", this.handleInputKeyDown);
        this.refs?.caret.removeEventListener("mousedown", this.handleCaretMouseDown);
        this.refs?.caret.removeEventListener("click", this.handleCaretClick);
        this.refs?.trigger.removeEventListener("mousedown", this.handleTriggerMouseDown);
        this.refs?.clearButton.removeEventListener("mousedown", this.handleClearMouseDown);
        this.refs?.clearButton.removeEventListener("click", this.handleClearClick);
        document.removeEventListener("mousedown", this.handleOutsideMouseDown);
    }

    private readonly handleInputChange = (event: Event): void => {
        if (this.disabled || this.readOnly) return;
        const input = event.currentTarget as HTMLInputElement;
        if (!this.coreController?.getState().open) this.coreController?.open();
        this.coreController?.setQuery(input.value);
    };

    private readonly handleInputFocus = (): void => {
        if (this.disabled || this.readOnly) return;
        if (!this.coreController?.getState().open) this.coreController?.open();
    };

    private readonly handleInputClick = (): void => {
        if (this.disabled || this.readOnly) return;
        if (!this.coreController?.getState().open) this.coreController?.open();
    };

    private readonly handleCaretMouseDown = (event: Event): void => {
        event.preventDefault();
    };

    private readonly handleCaretClick = (): void => {
        if (this.disabled || this.readOnly) return;
        if (this.coreController?.getState().open) {
            this.coreController.close();
        } else {
            this.coreController?.open();
            this.refs?.input.focus({ preventScroll: true });
        }
    };

    private readonly handleTriggerMouseDown = (event: MouseEvent): void => {
        if (this.coreController?.getState().mode !== "multi") return;
        if (this.disabled || this.readOnly) return;
        if (event.target === this.refs?.input) return;
        if (event.target instanceof Element && event.target.closest("[data-select-chip-remove], [data-select-clear]")) return;
        event.preventDefault();
        if (!this.coreController?.getState().open) this.coreController?.open();
        this.refs?.input.focus({ preventScroll: true });
    };

    private readonly handleClearMouseDown = (event: Event): void => {
        event.preventDefault();
        event.stopPropagation();
    };

    private readonly handleClearClick = (event: Event): void => {
        if (this.disabled || this.readOnly) return;
        event.stopPropagation();
        this.coreController?.clear();
        this.refs?.input.focus({ preventScroll: true });
    };

    private readonly handleInputKeyDown = (event: KeyboardEvent): void => {
        if (!this.keyDispatcher) return;
        if (this.keyDispatcher.dispatch(event.key) === "handled") {
            event.preventDefault();
        }
    };

    private readonly handleOutsideMouseDown = (event: MouseEvent): void => {
        if (!this.coreController?.getState().open) return;
        const path = event.composedPath();
        if (path.includes(this)) return;
        this.coreController.close();
    };

    private readonly handleSnapshotChange = (): void => {
        if (!this.refs || !this.coreController) return;
        const snapshot = this.coreController.getState();
        this.paintSnapshot(snapshot);
        this.syncFormState(snapshot);
        const currentKey = SelectBoxSnapshotView.valueKey(snapshot.value);
        if (currentKey !== this.previousValueKey) {
            this.previousValueKey = currentKey;
            this.dispatchEvent(new Event("change", { bubbles: true }));
        }
    };

    private syncFormState(snapshot: SelectBoxSnapshot<TExtra, SelectionValue>): void {
        const value = snapshot.value;
        if (isMultiSelection(value)) {
            if (this.name === "" || value.length === 0) {
                this.internals.setFormValue(null);
                this.syncValidity();
                return;
            }
            const formData = new FormData();
            for (const entry of value) {
                formData.append(this.name, entry);
            }
            this.internals.setFormValue(formData);
            this.syncValidity();
            return;
        }
        const formValue = encodeFormValue(value);
        this.internals.setFormValue(formValue, formValue);
        this.syncValidity();
    }

    private syncValidity(): void {
        if (!this.required || this.disabled || this.readOnly) {
            this.internals.setValidity({});
            return;
        }
        const snapshot = this.coreController?.getState();
        const hasSelection = snapshot ? snapshot.selectedOptions.length > 0 : false;
        if (!hasSelection) {
            this.internals.setValidity(
                { valueMissing: true },
                "Please pick an option.",
                this.refs?.input,
            );
            return;
        }
        this.internals.setValidity({});
    }

    private paintSnapshot(snapshot: SelectBoxSnapshot<TExtra, SelectionValue>): void {
        if (!this.refs) return;
        const view = new SelectBoxSnapshotView(snapshot);
        const isMulti = snapshot.mode === "multi";
        const placeholder = this.getAttribute("placeholder") ?? "Select…";

        // `mode` is this element's own attribute API; `data-select-mode` is the
        // cross-wrapper contract every stylesheet branches on.
        if (this.getAttribute("mode") !== snapshot.mode) {
            this.setAttribute("mode", snapshot.mode);
        }
        this.dataset["selectMode"] = snapshot.mode;
        this.classList.toggle("select-box-multi", isMulti);

        // Which surface is live is expressed on the elements, not only in the
        // stylesheet, so it survives a consumer rule that sets `display`.
        const isInline = this.isInline;
        this.refs.trigger.hidden = isInline;
        this.refs.inline.hidden = !isInline;
        // The dormant surface is emptied rather than just hidden: its rows carry
        // `data-select-option` too, and leaving them would double every contract
        // query after a surface switch.
        if (isInline) this.refs.list.replaceChildren();
        else this.refs.inline.replaceChildren();
        if (isInline) {
            this.refs.popover.hidden = true;
            this.paintInlineChips(snapshot, view, isMulti);
            return;
        }

        const inputValue = view.triggerInputValue;
        if (this.refs.input.value !== inputValue) {
            this.refs.input.value = inputValue;
        }

        const hasSelection = snapshot.selectedOptions.length > 0;
        const placeholderText = isMulti
            ? (hasSelection ? "" : placeholder)
            : (snapshot.open && snapshot.selectedOption
                ? snapshot.selectedOption.label
                : placeholder);
        this.refs.input.placeholder = placeholderText;
        this.refs.input.setAttribute("aria-expanded", String(snapshot.open));
        this.refs.input.setAttribute("aria-readonly", String(this.readOnly));
        this.refs.input.disabled = this.disabled;

        this.paintChips(snapshot, isMulti);
        this.refs.caret.hidden = isMulti;
        this.paintClearButton(hasSelection, isMulti);

        this.refs.popover.hidden = !snapshot.open;
        if (!snapshot.open) return;

        this.paintList(snapshot, view, isMulti);
    }

    /** Renders every option as a toggleable chip into the inline container,
     * mirroring the docs-starlight light-DOM inline surface. Reuses the
     * shadow scaffold's `.inline` element. */
    private paintInlineChips(
        snapshot: SelectBoxSnapshot<TExtra, SelectionValue>,
        view: SelectBoxSnapshotView<TExtra, SelectionValue>,
        isMulti: boolean,
    ): void {
        if (!this.refs) return;
        this.refs.inline.setAttribute(
            "aria-multiselectable",
            isMulti ? "true" : "false",
        );
        this.refs.inline.replaceChildren();
        for (const group of snapshot.filteredGroups) {
            if (group.label !== "") {
                const header = this.createHeaderElement(group.label);
                this.refs.inline.appendChild(header);
            }
            for (const option of group.options) {
                this.refs.inline.appendChild(
                    this.createInlineChipButton(option, view.isSelected(option.value)),
                );
            }
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
        button.className = [
            "select-box-chip",
            "select-box-chip-selectable",
            isSelected ? "select-box-chip-selected" : null,
            option.disabled === true ? "select-box-chip-disabled" : null,
        ]
            .filter((value): value is string => value !== null)
            .join(" ");
        button.dataset["selectChip"] = "";
        button.dataset["selectOption"] = "";
        if (isSelected) button.dataset["selectSelected"] = "";
        if (option.disabled) button.disabled = true;
        button.textContent = option.label;
        button.addEventListener("click", () => {
            if (option.disabled) return;
            this.coreController?.commitOption(option);
        });
        return button;
    }

    private paintChips(
        snapshot: SelectBoxSnapshot<TExtra, SelectionValue>,
        isMulti: boolean,
    ): void {
        if (!this.refs) return;
        const container = this.refs.tagsContainer;
        const input = this.refs.input;
        // Remove any existing chips while preserving the input as the last child.
        const existingChips = container.querySelectorAll<HTMLSpanElement>("[data-select-chip]");
        existingChips.forEach((chip) => chip.remove());
        if (!isMulti) return;
        const fragment = document.createDocumentFragment();
        for (const option of snapshot.selectedOptions) {
            fragment.appendChild(this.createChipElement(option));
        }
        container.insertBefore(fragment, input);
    }

    private paintClearButton(hasSelection: boolean, isMulti: boolean): void {
        if (!this.refs) return;
        const visible = isMulti && hasSelection;
        if (visible) {
            this.refs.clearButton.removeAttribute("hidden");
            this.refs.clearButton.dataset["hasSelection"] = "";
        } else {
            this.refs.clearButton.setAttribute("hidden", "");
            delete this.refs.clearButton.dataset["hasSelection"];
        }
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
            this.coreController?.commitOption(option);
            this.refs?.input.focus({ preventScroll: true });
        });
        chip.append(remove);
        return chip;
    }

    private paintList(
        snapshot: SelectBoxSnapshot<TExtra, SelectionValue>,
        view: SelectBoxSnapshotView<TExtra, SelectionValue>,
        isMulti: boolean,
    ): void {
        if (!this.refs || !this.listVirtualizer) return;

        if (snapshot.filteredGroups !== this.lastRowModelSource) {
            this.rowModel = new SelectBoxRowModel<TExtra>({ groups: snapshot.filteredGroups });
            this.lastRowModelSource = snapshot.filteredGroups;
        }
        this.listVirtualizer.sync();

        const list = this.refs.list;

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
            this.listVirtualizer.measureElement(node);
        }

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
        button.className = "select-box-option";
        button.setAttribute("role", "option");
        button.setAttribute("aria-selected", String(isSelected));
        button.tabIndex = -1;
        if (isSelected && isMulti) button.classList.add("select-box-option-selected");
        button.dataset["selectOption"] = "";
        if (isActive) {
            button.classList.add("select-box-option-active");
            button.dataset["selectActive"] = "";
        }
        if (isSelected) {
            button.dataset["selectSelected"] = "";
        }
        if (option.disabled) {
            button.classList.add("select-box-option-disabled");
            button.disabled = true;
        }
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
            this.coreController?.commitOption(option);
            if (isMulti) this.refs?.input.focus({ preventScroll: true });
        });
        return button;
    }

    private createLabelNodes(label: string): Node[] {
        const ranges = this.coreController?.getState().highlightRanges(label) ?? [];
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
