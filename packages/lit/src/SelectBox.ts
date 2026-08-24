import {
    SelectBoxKeyDispatcher,
    SelectBoxListVirtualizer,
    SelectBoxRowModel,
    nextSelectBoxId,
    optionElementId,
    SelectBoxSnapshotView,
    TextHighlighter,
    isMultiSelection,
    type OptionFilterStrategy,
    type SelectBoxAddon,
    type SelectBoxController as CoreSelectBoxController,
    type SelectBoxSnapshot,
    type SelectionValue,
    type SelectionValueInput,
    type SelectOption,
} from "@select-box/core";
import { html, LitElement, nothing, type PropertyValues, type TemplateResult } from "lit";
import { createRef, ref, type Ref } from "lit/directives/ref.js";

import { SelectBoxController } from "./select-box-controller.js";

const ESTIMATED_OPTION_HEIGHT = 36;
const ESTIMATED_HEADER_HEIGHT = 28;
const LIST_VIEWPORT_HEIGHT = 240;

/**
 * Form-associated Lit select box; consumers register it under a tag of their
 * choice. Switches between single and multi mode via the `multi` boolean
 * property/attribute (default `false`).
 */
export class SelectBox<TExtra extends object = object> extends LitElement {
    static readonly formAssociated = true;

    static override readonly properties = {
        options: { attribute: false },
        addons: { attribute: false },
        filter: { attribute: false },
        placeholder: { type: String },
        ungroupedLabel: { type: String, attribute: "ungrouped-label" },
        name: { type: String },
        disabled: { type: Boolean, reflect: true },
        required: { type: Boolean, reflect: true },
        readOnly: { type: Boolean, reflect: true, attribute: "readonly" },
        multi: { type: Boolean, reflect: true },
        surface: { type: String, reflect: true },
    } as const;

    options?: ReadonlyArray<SelectOption<TExtra>>;
    addons?: ReadonlyArray<SelectBoxAddon<TExtra>>;
    filter?: OptionFilterStrategy<TExtra>;
    placeholder: string | undefined = undefined;
    ungroupedLabel = "";
    name = "";
    disabled = false;
    required = false;
    readOnly = false;
    multi = false;
    /** Rendering style. `"popover"` (default) shows a combobox dropdown; `"inline"`
     * renders every option as a toggleable chip with no popover/input/search. */
    surface: "popover" | "inline" = "popover";

    private get isInline(): boolean {
        return this.surface === "inline";
    }

    private readonly internals = this.attachInternals();
    private reactiveController: SelectBoxController<TExtra, SelectionValue> | null = null;
    private readonly instanceId = nextSelectBoxId();
    private pendingValue: SelectionValueInput = null;
    private keyDispatcher: SelectBoxKeyDispatcher<TExtra, SelectionValue> | null = null;
    private previousValueKey: string = SelectBoxSnapshotView.valueKey(null);

    private readonly inputRef: Ref<HTMLInputElement> = createRef();
    private readonly listRef: Ref<HTMLDivElement> = createRef();
    private rowModel: SelectBoxRowModel<TExtra> = new SelectBoxRowModel<TExtra>({ groups: [] });
    private lastRowModelSource: ReadonlyArray<unknown> | null = null;
    private virtualizer: SelectBoxListVirtualizer | null = null;
    private unsubscribeFromVirtualizer: (() => void) | null = null;
    private listVirtualizerMounted = false;
    private lastScrolledActiveIndex = -1;

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
    get controller(): CoreSelectBoxController<TExtra, SelectionValue> | null {
        return this.reactiveController?.core ?? null;
    }

    get value(): SelectionValue {
        return this.reactiveController?.state.value ?? null;
    }

    /**
     * Sets the selection, matching the getter every other wrapper pairs with one.
     *
     * Committed through the controller rather than by rebuilding, so the value is
     * pruned against the current options the same way any other commit is.
     */
    set value(next: SelectionValueInput) {
        if (this.reactiveController) this.reactiveController.core.commitValue(next);
        else this.pendingValue = next;
    }

    /** First selected option (or `null`). Same as the snapshot field. */
    get selectedOption(): SelectOption<TExtra> | null {
        return this.reactiveController?.state.selectedOption ?? null;
    }

    /** Every selected option. Length 0 or 1 in single mode. */
    get selectedOptions(): ReadonlyArray<SelectOption<TExtra>> {
        return this.reactiveController?.state.selectedOptions ?? [];
    }

    get form(): HTMLFormElement | null {
        return this.internals.form;
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

    formResetCallback(): void {
        this.reactiveController?.core.reset();
    }

    formDisabledCallback(disabled: boolean): void {
        this.disabled = disabled;
    }

    protected override createRenderRoot(): HTMLElement {
        return this;
    }

    override connectedCallback(): void {
        super.connectedCallback();
        this.dataset["selectRoot"] = "";
        this.classList.add("select-box");
        // Popover-only side effects: outside-click closes the popover and the
        // virtualizer drives the list. Inline surface needs neither.
        if (this.isInline) return;
        document.addEventListener("mousedown", this.handleOutsideMouseDown);
        this.virtualizer = new SelectBoxListVirtualizer({
            getScrollElement: () => this.listRef.value ?? null,
            getCount: () => this.rowModel.length,
            estimateSize: (index) => this.estimateRowSize(this.rowModel, index),
            initialViewportHeight: LIST_VIEWPORT_HEIGHT,
        });
        this.unsubscribeFromVirtualizer = this.virtualizer.subscribe(() => this.requestUpdate());
    }

    override disconnectedCallback(): void {
        super.disconnectedCallback();
        document.removeEventListener("mousedown", this.handleOutsideMouseDown);
        this.unsubscribeFromVirtualizer?.();
        this.unsubscribeFromVirtualizer = null;
        this.virtualizer?.dispose();
        this.virtualizer = null;
        this.listVirtualizerMounted = false;
    }

    protected override willUpdate(changed: PropertyValues<this>): void {
        // `options` swaps in place on a live controller so the committed selection
        // survives, the way a native select behaves when its children change.
        // `addons` and `ungroupedLabel` are construction-time and still rebuild.
        const rebuildOnlyChanges = changed.has("addons") || changed.has("ungroupedLabel");
        if (!this.reactiveController || rebuildOnlyChanges) {
            this.rebuildController();
        } else if (changed.has("options")) {
            this.reactiveController.core.setOptions(this.options ?? []);
        } else if (changed.has("multi") && this.reactiveController) {
            // Mode toggle preserves the current selection via driver coerce —
            // no need to throw away the controller.
            this.reactiveController.core.setMode(this.multi ? "multi" : "single");
        } else if (changed.has("filter") && this.filter !== undefined) {
            this.reactiveController.setFilter(this.filter);
        }

        if (this.reactiveController !== null
            && (changed.has("disabled") || changed.has("readOnly"))) {
            // The controller owns the refusal; the element only mirrors its own
            // properties into it.
            this.reactiveController.core.setInteractivity({
                disabled: this.disabled,
                readOnly: this.readOnly,
            });
        }

        if (this.reactiveController !== null && this.virtualizer !== null) {
            const filteredGroups = this.reactiveController.state.filteredGroups;
            if (filteredGroups !== this.lastRowModelSource) {
                this.rowModel = new SelectBoxRowModel<TExtra>({ groups: filteredGroups });
                this.lastRowModelSource = filteredGroups;
            }
            this.virtualizer.syncCount();
        }
    }

    protected override updated(): void {
        if (!this.reactiveController) return;
        const snapshot = this.reactiveController.state;
        // Root-level markers live on the host: there is no wrapper div, so the
        // element itself is what a stylesheet and the contract address.
        this.dataset["selectMode"] = snapshot.mode;
        this.classList.toggle("select-box-multi", snapshot.mode === "multi");
        this.syncFormValue(snapshot);
        this.syncValidity();
        const currentKey = SelectBoxSnapshotView.valueKey(snapshot.value);
        if (currentKey !== this.previousValueKey) {
            this.previousValueKey = currentKey;
            this.dispatchEvent(new Event("change", { bubbles: true }));
        }
        if (snapshot.open && this.listRef.value !== undefined) {
            if (!this.listVirtualizerMounted) {
                this.virtualizer?.mount();
                this.listVirtualizerMounted = true;
            } else {
                this.virtualizer?.sync();
            }
        }
        if (!snapshot.open) {
            this.listVirtualizerMounted = false;
        }
        this.scrollActiveOptionIntoView(snapshot.activeIndex);
    }

    private rebuildController(): void {
        this.reactiveController = new SelectBoxController<TExtra, SelectionValue>(this, {
            mode: this.multi ? "multi" : "single",
            ...(this.options !== undefined ? { options: this.options } : {}),
            ...(this.addons !== undefined ? { addons: this.addons } : {}),
            ...(this.filter !== undefined ? { filter: this.filter } : {}),
            ungroupedLabel: this.ungroupedLabel,
            disabled: this.disabled,
            readOnly: this.readOnly,
            initialValue: this.pendingValue,
        });
        this.keyDispatcher = new SelectBoxKeyDispatcher(this.reactiveController.core);
        this.previousValueKey = SelectBoxSnapshotView.valueKey(this.reactiveController.state.value);
    }

    private scrollActiveOptionIntoView(activeIndex: number): void {
        if (this.virtualizer === null) return;
        const targetRow = this.rowModel.findRowIndexForActiveIndex(activeIndex);
        if (targetRow < 0) {
            this.lastScrolledActiveIndex = -1;
            return;
        }
        if (targetRow === this.lastScrolledActiveIndex) return;
        this.lastScrolledActiveIndex = targetRow;
        this.virtualizer.scrollToIndex(targetRow, "auto");
    }

    private syncFormValue(snapshot: SelectBoxSnapshot<TExtra, SelectionValue>): void {
        const value = snapshot.value;
        if (isMultiSelection(value)) {
            // Multi: submit as multiple FormData entries under the same name.
            if (this.name === "" || value.length === 0) {
                this.internals.setFormValue(null);
                return;
            }
            const formData = new FormData();
            for (const entry of value) {
                formData.append(this.name, entry);
            }
            this.internals.setFormValue(formData);
            return;
        }
        this.internals.setFormValue(value ?? "");
    }

    private syncValidity(): void {
        if (!this.required || this.disabled || this.readOnly) {
            this.internals.setValidity({});
            return;
        }
        const snapshot = this.reactiveController?.state;
        const hasSelection = snapshot ? snapshot.selectedOptions.length > 0 : false;
        if (!hasSelection) {
            this.internals.setValidity({ valueMissing: true }, "Please pick an option.");
            return;
        }
        this.internals.setValidity({});
    }

    private readonly handleOutsideMouseDown = (event: MouseEvent): void => {
        if (!this.reactiveController?.state.open) return;
        if (!(event.target instanceof Node)) return;
        if (this.contains(event.target)) return;
        this.reactiveController.close();
    };

    private readonly handleInputFocus = (): void => {
        if (!this.reactiveController?.state.open) this.reactiveController?.open();
    };

    private readonly handleInputClick = (): void => {
        if (!this.reactiveController?.state.open) this.reactiveController?.open();
    };

    private readonly handleInput = (event: Event): void => {
        if (!this.reactiveController?.state.open) this.reactiveController?.open();
        this.reactiveController?.setQuery((event.target as HTMLInputElement).value);
    };

    private readonly handleControlMouseDown = (event: MouseEvent): void => {
        if (event.target !== this.inputRef.value) event.preventDefault();
        if (!this.reactiveController?.state.open) this.reactiveController?.open();
        this.inputRef.value?.focus({ preventScroll: true });
    };

    private readonly handleCaretMouseDown = (event: MouseEvent): void => {
        event.preventDefault();
    };

    private readonly handleCaretClick = (): void => {
        if (this.reactiveController?.state.open) {
            this.reactiveController.close();
        } else {
            this.reactiveController?.open();
            this.inputRef.value?.focus({ preventScroll: true });
        }
    };

    private readonly handleKeyDown = (event: KeyboardEvent): void => {
        if (!this.keyDispatcher) return;
        if (this.keyDispatcher.dispatch(event.key) === "handled") {
            event.preventDefault();
        }
    };

    private readonly handleChipRemove = (
        option: SelectOption<TExtra>,
        event: MouseEvent,
    ): void => {
        event.stopPropagation();
        this.reactiveController?.commitOption(option);
        this.inputRef.value?.focus({ preventScroll: true });
    };

    private readonly handleClearAll = (event: MouseEvent): void => {
        event.stopPropagation();
        this.reactiveController?.clear();
        this.inputRef.value?.focus({ preventScroll: true });
    };

    private estimateRowSize(model: SelectBoxRowModel<TExtra>, index: number): number {
        return model.getRowAt(index)?.kind === "header"
            ? ESTIMATED_HEADER_HEIGHT
            : ESTIMATED_OPTION_HEIGHT;
    }

    private readonly handleRowRef = (node: Element | undefined): void => {
        if (node === undefined) {
            this.virtualizer?.measureElement(null);
            return;
        }
        if (node instanceof HTMLElement) {
            this.virtualizer?.measureElement(node);
        }
    };

    private optionClasses(
        isActive: boolean,
        isSelected: boolean,
        isDisabled: boolean | undefined,
        isMulti: boolean,
    ): string {
        return [
            "select-box-option",
            isActive ? "select-box-option-active" : null,
            isSelected && isMulti ? "select-box-option-selected" : null,
            isDisabled ? "select-box-option-disabled" : null,
        ]
            .filter((value): value is string => value !== null)
            .join(" ");
    }

    /** Element id of the highlighted row, or null when nothing is highlighted. */
    private activeDescendantId(
        state: SelectBoxSnapshot<TExtra, SelectionValue>,
    ): string | null {
        if (state.activeOption === null) return null;
        return optionElementId(this.instanceId, state.activeOption.value);
    }

    override render(): TemplateResult {
        const state = this.reactiveController?.state;
        if (!state) return html``;
        if (this.isInline) return this.renderInline(state);
        const isMulti = state.mode === "multi";
        return html`
            ${isMulti ? this.renderMultiTrigger(state) : this.renderSingleTrigger(state)}
            ${state.open ? this.renderPopover(state) : nothing}
        `;
    }

    private renderInline(
        state: SelectBoxSnapshot<TExtra, SelectionValue>,
    ): TemplateResult {
        const isMulti = state.mode === "multi";
        const view = new SelectBoxSnapshotView(state);
        return html`
            <div
                class="select-box-inline"
                role="listbox"
                aria-multiselectable=${isMulti ? "true" : nothing}
                data-select-surface="inline"
            >
                ${state.filteredGroups.map((group) => html`
                    ${group.label
                        ? html`<div class="select-box-group-label" data-select-group-label>${group.label}</div>`
                        : nothing}
                    <div class="select-box-tags" data-select-tags>
                        ${group.options.map((option) => {
                            const isSelected = view.isSelected(option.value);
                            const chipClasses = [
                                "select-box-chip",
                                "select-box-chip-selectable",
                                isSelected ? "select-box-chip-selected" : null,
                                option.disabled ? "select-box-chip-disabled" : null,
                            ]
                                .filter((value): value is string => value !== null)
                                .join(" ");
                            return html`
                                <button
                                    type="button"
                                    role="option"
                                    aria-selected=${isSelected}
                                    aria-pressed=${isSelected}
                                    class=${chipClasses}
                                    ?disabled=${option.disabled}
                                    data-select-chip
                                    data-select-option
                                    data-select-selected=${isSelected ? "" : nothing}
                                    @click=${() => this.commitInlineChip(option)}
                                >${option.label}</button>
                            `;
                        })}
                    </div>
                `)}
            </div>
        `;
    }

    private commitInlineChip(option: SelectOption<TExtra>): void {
        if (option.disabled) return;
        this.reactiveController?.commitOption(option);
    }

    private renderSingleTrigger(
        state: SelectBoxSnapshot<TExtra, SelectionValue>,
    ): TemplateResult {
        const view = new SelectBoxSnapshotView(state);
        const inputValue = view.triggerInputValue;
        const clearControl = view.clearControl;
        const placeholderText = state.open && state.selectedOption
            ? state.selectedOption.label
            : (this.placeholder ?? "Select…");
        return html`
            <div class="select-box-trigger" data-select-trigger>
                <input
                    ${ref(this.inputRef)}
                    type="text"
                    class="select-box-input"
                    role="combobox"
                    aria-haspopup="listbox"
                    aria-autocomplete="list"
                    aria-expanded=${state.open}
                    aria-readonly=${this.readOnly}
                    aria-label=${this.getAttribute("aria-label") ?? nothing}
                    aria-labelledby=${this.getAttribute("aria-labelledby") ?? nothing}
                    aria-activedescendant=${this.activeDescendantId(state) ?? nothing}
                    ?disabled=${this.disabled}
                    ?readonly=${this.readOnly}
                    placeholder=${placeholderText}
                    .value=${inputValue}
                    data-select-input
                    @input=${this.handleInput}
                    @focus=${this.handleInputFocus}
                    @click=${this.handleInputClick}
                    @keydown=${this.handleKeyDown}
                />
                <button
                    type="button"
                    class="select-box-caret"
                    data-select-caret
                    tabindex="-1"
                    aria-hidden="true"
                    @mousedown=${this.handleCaretMouseDown}
                    @click=${this.handleCaretClick}
                >▾</button>
                ${clearControl.visible
                    ? html`
                        <button
                            type="button"
                            class="select-box-clear"
                            aria-label=${clearControl.ariaLabel}
                            tabindex="-1"
                            data-select-clear
                            @mousedown=${(event: Event) => event.stopPropagation()}
                            @click=${this.handleClearAll}
                        >${clearControl.label}</button>
                    `
                    : nothing}
            </div>
        `;
    }

    private renderMultiTrigger(
        state: SelectBoxSnapshot<TExtra, SelectionValue>,
    ): TemplateResult {
        const hasSelection = state.selectedOptions.length > 0;
        const placeholderText = hasSelection ? "" : (this.placeholder ?? "Select…");
        const view = new SelectBoxSnapshotView<TExtra, SelectionValue>(state);
        const clearControl = view.clearControl;
        const removeControl = view.removeControl;
        return html`
            <div
                class="select-box-trigger"
                role="combobox"
                aria-haspopup="listbox"
                aria-expanded=${state.open}
                aria-label=${this.getAttribute("aria-label") ?? nothing}
                aria-labelledby=${this.getAttribute("aria-labelledby") ?? nothing}
                aria-activedescendant=${this.activeDescendantId(state) ?? nothing}
                data-select-trigger
                @mousedown=${this.handleControlMouseDown}
            >
                <div class="select-box-tags" data-select-tags>
                    ${state.selectedOptions.map(
                        (option) => html`
                            <span class="select-box-chip" data-select-chip>
                                ${option.label}
                                <button
                                    type="button"
                                    class="select-box-chip-remove"
                                    aria-label=${removeControl.ariaLabelFor(option.label)}
                                    data-select-chip-remove
                                    @mousedown=${(event: Event) => event.stopPropagation()}
                                    @click=${(event: MouseEvent) => this.handleChipRemove(option, event)}
                                >×</button>
                            </span>
                        `,
                    )}
                    <input
                        ${ref(this.inputRef)}
                        type="text"
                        class="select-box-input"
                        role="searchbox"
                        aria-autocomplete="list"
                        ?disabled=${this.disabled}
                    ?readonly=${this.readOnly}
                        placeholder=${placeholderText}
                        .value=${state.query}
                        data-select-input
                        @input=${this.handleInput}
                        @focus=${this.handleInputFocus}
                        @keydown=${this.handleKeyDown}
                    />
                </div>
                ${clearControl.visible
                    ? html`
                        <button
                            type="button"
                            class="select-box-clear"
                            aria-label=${clearControl.ariaLabel}
                            tabindex="-1"
                            data-select-clear
                            @mousedown=${(event: Event) => event.stopPropagation()}
                            @click=${this.handleClearAll}
                        >${clearControl.label}</button>
                    `
                    : nothing}
            </div>
        `;
    }

    private renderPopover(
        state: SelectBoxSnapshot<TExtra, SelectionValue>,
    ): TemplateResult {
        return html`
            <div
                class="select-box-popover"
                role="listbox"
                aria-multiselectable=${state.mode === "multi" ? "true" : nothing}
                data-select-popover
            >
                <div
                    ${ref(this.listRef)}
                    class="select-box-list"
                    data-select-list
                    style="max-height: ${LIST_VIEWPORT_HEIGHT}px; overflow-y: auto;"
                >
                    ${state.isEmpty
                        ? html`<p class="select-box-empty" data-select-empty>No matches</p>`
                        : this.renderVirtualRows(state)}
                </div>
            </div>
        `;
    }

    private renderVirtualRows(
        state: SelectBoxSnapshot<TExtra, SelectionValue>,
    ): TemplateResult {
        if (this.virtualizer === null) return html``;
        const items = this.virtualizer.getVirtualItems();
        const totalSize = this.virtualizer.getTotalSize();
        const paddingTop = items[0]?.start ?? 0;
        const paddingBottom = Math.max(0, totalSize - (items.at(-1)?.end ?? 0));
        const activeRowIndex = this.rowModel.findRowIndexForActiveIndex(state.activeIndex);
        const view = new SelectBoxSnapshotView(state);
        const isMulti = state.mode === "multi";
        return html`
            <div style="padding-top: ${paddingTop}px; padding-bottom: ${paddingBottom}px;">
                ${items.map((virtualRow) =>
                    this.renderRow(virtualRow.index, activeRowIndex, view, isMulti),
                )}
            </div>
        `;
    }

    private renderRow(
        rowIndex: number,
        activeRowIndex: number,
        view: SelectBoxSnapshotView<TExtra, SelectionValue>,
        isMulti: boolean,
    ): TemplateResult | typeof nothing {
        const row = this.rowModel.getRowAt(rowIndex);
        if (row === undefined) return nothing;
        if (row.kind === "header") {
            return html`
                <div
                    data-index=${rowIndex}
                    ${ref(this.handleRowRef)}
                    class="select-box-group-label"
                    data-select-group-label
                >
                    ${row.group.label}
                </div>
            `;
        }
        const isActive = rowIndex === activeRowIndex;
        const isSelected = view.isSelected(row.option.value);
        return html`
            <button
                data-index=${rowIndex}
                ${ref(this.handleRowRef)}
                type="button"
                role="option"
                aria-selected=${isSelected}
                class=${this.optionClasses(isActive, isSelected, row.option.disabled, isMulti)}
                ?disabled=${row.option.disabled}
                tabindex="-1"
                id=${optionElementId(this.instanceId, row.option.value)}
                data-select-option
                data-select-active=${isActive ? "" : nothing}
                data-select-selected=${isSelected ? "" : nothing}
                @mousedown=${(event: Event) => event.preventDefault()}
                @click=${() => this.commitFromList(row.option, isMulti)}
            >
                ${isMulti
                    ? html`<span class="select-box-option-tick" aria-hidden="true">${isSelected ? "✓" : ""}</span>`
                    : nothing}
                ${this.renderLabel(row.option.label)}
            </button>
        `;
    }

    private commitFromList(option: SelectOption<TExtra>, isMulti: boolean): void {
        this.reactiveController?.commitOption(option);
        if (isMulti) this.inputRef.value?.focus({ preventScroll: true });
    }

    private renderLabel(label: string): TemplateResult[] {
        const state = this.reactiveController?.state;
        const ranges = state ? state.highlightRanges(label) : [];
        return TextHighlighter.split(label, ranges).map((chunk) =>
            chunk.matched
                ? html`<mark class="select-box-option-match">${chunk.text}</mark>`
                : html`<span>${chunk.text}</span>`,
        );
    }
}
