import {
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
    placeholder = "";
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
    private controller: SelectBoxController<TExtra, SelectionValue> | null = null;
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

    get value(): SelectionValue {
        return this.controller?.state.value ?? null;
    }

    /** First selected option (or `null`). Same as the snapshot field. */
    get selectedOption(): SelectOption<TExtra> | null {
        return this.controller?.state.selectedOption ?? null;
    }

    /** Every selected option. Length 0 or 1 in single mode. */
    get selectedOptions(): ReadonlyArray<SelectOption<TExtra>> {
        return this.controller?.state.selectedOptions ?? [];
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
        this.controller?.clear();
    }

    formDisabledCallback(disabled: boolean): void {
        this.disabled = disabled;
    }

    protected override createRenderRoot(): HTMLElement {
        return this;
    }

    override connectedCallback(): void {
        super.connectedCallback();
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
        const rebuildOnlyChanges =
            changed.has("options") ||
            changed.has("addons") ||
            changed.has("ungroupedLabel");
        if (!this.controller || rebuildOnlyChanges) {
            this.rebuildController();
        } else if (changed.has("multi") && this.controller) {
            // Mode toggle preserves the current selection via driver coerce —
            // no need to throw away the controller.
            this.controller.core.setMode(this.multi ? "multi" : "single");
        } else if (changed.has("filter") && this.filter !== undefined) {
            this.controller.setFilter(this.filter);
        }

        if (this.controller !== null && this.virtualizer !== null) {
            const filteredGroups = this.controller.state.filteredGroups;
            if (filteredGroups !== this.lastRowModelSource) {
                this.rowModel = new SelectBoxRowModel<TExtra>({ groups: filteredGroups });
                this.lastRowModelSource = filteredGroups;
            }
            this.virtualizer.syncCount();
        }
    }

    protected override updated(): void {
        if (!this.controller) return;
        const snapshot = this.controller.state;
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
        this.controller = new SelectBoxController<TExtra, SelectionValue>(this, {
            mode: this.multi ? "multi" : "single",
            ...(this.options !== undefined ? { options: this.options } : {}),
            ...(this.addons !== undefined ? { addons: this.addons } : {}),
            ...(this.filter !== undefined ? { filter: this.filter } : {}),
            ungroupedLabel: this.ungroupedLabel,
        });
        this.keyDispatcher = new SelectBoxKeyDispatcher(this.controller.core);
        this.previousValueKey = SelectBoxSnapshotView.valueKey(this.controller.state.value);
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
        const snapshot = this.controller?.state;
        const hasSelection = snapshot ? snapshot.selectedOptions.length > 0 : false;
        if (!hasSelection) {
            this.internals.setValidity({ valueMissing: true }, "Please pick an option.");
            return;
        }
        this.internals.setValidity({});
    }

    private readonly handleOutsideMouseDown = (event: MouseEvent): void => {
        if (!this.controller?.state.open) return;
        if (!(event.target instanceof Node)) return;
        if (this.contains(event.target)) return;
        this.controller.close();
    };

    private readonly handleInputFocus = (): void => {
        if (this.disabled || this.readOnly) return;
        if (!this.controller?.state.open) this.controller?.open();
    };

    private readonly handleInputClick = (): void => {
        if (this.disabled || this.readOnly) return;
        if (!this.controller?.state.open) this.controller?.open();
    };

    private readonly handleInput = (event: Event): void => {
        if (this.disabled || this.readOnly) return;
        if (!this.controller?.state.open) this.controller?.open();
        this.controller?.setQuery((event.target as HTMLInputElement).value);
    };

    private readonly handleControlMouseDown = (event: MouseEvent): void => {
        if (this.disabled || this.readOnly) return;
        if (event.target !== this.inputRef.value) event.preventDefault();
        if (!this.controller?.state.open) this.controller?.open();
        this.inputRef.value?.focus({ preventScroll: true });
    };

    private readonly handleCaretMouseDown = (event: MouseEvent): void => {
        event.preventDefault();
    };

    private readonly handleCaretClick = (): void => {
        if (this.disabled || this.readOnly) return;
        if (this.controller?.state.open) {
            this.controller.close();
        } else {
            this.controller?.open();
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
        this.controller?.commitOption(option);
        this.inputRef.value?.focus({ preventScroll: true });
    };

    private readonly handleClearAll = (event: MouseEvent): void => {
        event.stopPropagation();
        this.controller?.clear();
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

    override render(): TemplateResult {
        const state = this.controller?.state;
        if (!state) return html``;
        if (this.isInline) return this.renderInline(state);
        const isMulti = state.mode === "multi";
        const rootClasses = ["select-box", isMulti ? "select-box-multi" : null]
            .filter((value): value is string => value !== null)
            .join(" ");
        return html`
            <div
                class=${rootClasses}
                part="root"
                data-select-root
                data-select-mode=${state.mode}
            >
                ${isMulti ? this.renderMultiTrigger(state) : this.renderSingleTrigger(state)}
                ${state.open ? this.renderPopover(state) : nothing}
            </div>
        `;
    }

    private renderInline(
        state: SelectBoxSnapshot<TExtra, SelectionValue>,
    ): TemplateResult {
        const isMulti = state.mode === "multi";
        const view = new SelectBoxSnapshotView(state);
        const rootClasses = [
            "select-box",
            "select-box-inline",
            isMulti ? "select-box-multi" : null,
        ]
            .filter((value): value is string => value !== null)
            .join(" ");
        return html`
            <div
                class=${rootClasses}
                part="root"
                role="listbox"
                aria-multiselectable=${isMulti ? "true" : nothing}
                data-select-root
                data-select-mode=${state.mode}
                data-select-surface="inline"
            >
                ${state.filteredGroups.map((group) => html`
                    ${group.label
                        ? html`<div class="select-box-group-label" part="group-label" data-select-group-label>${group.label}</div>`
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
        this.controller?.commitOption(option);
    }

    private renderSingleTrigger(
        state: SelectBoxSnapshot<TExtra, SelectionValue>,
    ): TemplateResult {
        const view = new SelectBoxSnapshotView(state);
        const inputValue = view.triggerInputValue;
        const placeholderText = state.open && state.selectedOption
            ? state.selectedOption.label
            : (this.placeholder || "Select…");
        return html`
            <div class="select-box-trigger" part="trigger" data-select-trigger>
                <input
                    ${ref(this.inputRef)}
                    type="text"
                    class="select-box-input"
                    part="input"
                    role="combobox"
                    aria-haspopup="listbox"
                    aria-autocomplete="list"
                    aria-expanded=${state.open}
                    aria-readonly=${this.readOnly}
                    ?disabled=${this.disabled}
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
                    part="caret"
                    tabindex="-1"
                    aria-hidden="true"
                    @mousedown=${this.handleCaretMouseDown}
                    @click=${this.handleCaretClick}
                >▾</button>
            </div>
        `;
    }

    private renderMultiTrigger(
        state: SelectBoxSnapshot<TExtra, SelectionValue>,
    ): TemplateResult {
        const hasSelection = state.selectedOptions.length > 0;
        const placeholderText = hasSelection ? "" : (this.placeholder || "Select…");
        return html`
            <div
                class="select-box-trigger"
                part="trigger"
                role="combobox"
                aria-haspopup="listbox"
                aria-expanded=${state.open}
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
                                    aria-label=${`Remove ${option.label}`}
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
                        part="input"
                        role="searchbox"
                        aria-autocomplete="list"
                        ?disabled=${this.disabled}
                        placeholder=${placeholderText}
                        .value=${state.query}
                        data-select-input
                        @input=${this.handleInput}
                        @focus=${this.handleInputFocus}
                        @keydown=${this.handleKeyDown}
                    />
                </div>
                ${hasSelection
                    ? html`
                        <button
                            type="button"
                            class="select-box-clear"
                            aria-label="Clear all"
                            tabindex="-1"
                            data-select-clear
                            @mousedown=${(event: Event) => event.stopPropagation()}
                            @click=${this.handleClearAll}
                        >×</button>
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
                part="popover"
                role="listbox"
                aria-multiselectable=${state.mode === "multi" ? "true" : nothing}
                data-select-popover
            >
                <div
                    ${ref(this.listRef)}
                    class="select-box-list"
                    part="list"
                    data-select-list
                    style="max-height: ${LIST_VIEWPORT_HEIGHT}px; overflow-y: auto;"
                >
                    ${state.isEmpty
                        ? html`<p class="select-box-empty" part="empty" data-select-empty>No matches</p>`
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
                    part="group-label"
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
        this.controller?.commitOption(option);
        if (isMulti) this.inputRef.value?.focus({ preventScroll: true });
    }

    private renderLabel(label: string): TemplateResult[] {
        const state = this.controller?.state;
        const ranges = state ? state.highlightRanges(label) : [];
        return TextHighlighter.split(label, ranges).map((chunk) =>
            chunk.matched
                ? html`<mark class="select-box-option-match">${chunk.text}</mark>`
                : html`<span>${chunk.text}</span>`,
        );
    }
}
