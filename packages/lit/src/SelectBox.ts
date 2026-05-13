import {
    SelectBoxListVirtualizer,
    SelectBoxRowModel,
    type OptionFilterStrategy,
    type SelectBoxAddon,
    type SelectOption,
} from "@select-box/core";
import { html, LitElement, nothing, type PropertyValues, type TemplateResult } from "lit";
import { createRef, ref, type Ref } from "lit/directives/ref.js";

import { SelectBoxController } from "./select-box-controller.js";

const ESTIMATED_OPTION_HEIGHT = 36;
const ESTIMATED_HEADER_HEIGHT = 28;
const LIST_VIEWPORT_HEIGHT = 240;

/**
 * Form-associated Lit select box; consumers register it under a tag of their choice.
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

    private readonly internals = this.attachInternals();
    private controller: SelectBoxController<TExtra> | null = null;
    private previousValue: string | null = null;

    private readonly listRef: Ref<HTMLDivElement> = createRef();
    private rowModel: SelectBoxRowModel<TExtra> = new SelectBoxRowModel<TExtra>([]);
    private lastRowModelSource: ReadonlyArray<unknown> | null = null;
    private virtualizer: SelectBoxListVirtualizer | null = null;
    private unsubscribeFromVirtualizer: (() => void) | null = null;
    private listVirtualizerMounted = false;
    private lastScrolledActiveIndex = -1;

    get value(): string | null {
        return this.controller?.state.value ?? null;
    }

    /**
     * Full option object for the current value, including any extra payload.
     * `null` when nothing is selected.
     */
    get selectedOption(): SelectOption<TExtra> | null {
        return this.controller?.state.selectedOption ?? null;
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

    // Light DOM so consumer stylesheets reach the rendered tree (matches the React/Vue components).
    protected override createRenderRoot(): HTMLElement {
        return this;
    }

    override connectedCallback(): void {
        super.connectedCallback();
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
            changed.has("options") || changed.has("addons") || changed.has("ungroupedLabel");
        if (!this.controller || rebuildOnlyChanges) {
            this.rebuildController();
        } else if (changed.has("filter") && this.filter !== undefined) {
            this.controller.setFilter(this.filter);
        }

        if (this.controller !== null && this.virtualizer !== null) {
            const filteredGroups = this.controller.state.filteredGroups;
            if (filteredGroups !== this.lastRowModelSource) {
                this.rowModel = new SelectBoxRowModel<TExtra>(filteredGroups);
                this.lastRowModelSource = filteredGroups;
            }
            // willUpdate fires BEFORE the template renders, so listRef is still
            // undefined here — calling sync() would detach observers. Only
            // refresh the count; sync() runs from updated() after commit.
            this.virtualizer.syncCount();
        }
    }

    protected override updated(): void {
        if (!this.controller) return;
        const snapshot = this.controller.state;
        this.internals.setFormValue(snapshot.value ?? "");
        this.syncValidity();
        if (snapshot.value !== this.previousValue) {
            this.previousValue = snapshot.value;
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
        this.controller = new SelectBoxController<TExtra>(this, {
            ...(this.options !== undefined ? { options: this.options } : {}),
            ...(this.addons !== undefined ? { addons: this.addons } : {}),
            ...(this.filter !== undefined ? { filter: this.filter } : {}),
            ungroupedLabel: this.ungroupedLabel,
        });
    }

    private scrollActiveOptionIntoView(activeIndex: number): void {
        if (this.virtualizer === null) return;
        const targetRow = this.rowModel.findRowIndexForActiveIndex(activeIndex);
        if (targetRow < 0) {
            this.lastScrolledActiveIndex = -1;
            return;
        }
        // Only scroll when the active row actually changed — otherwise every
        // scroll-driven repaint would yank the viewport back to the active
        // option, fighting the user's wheel/touch.
        if (targetRow === this.lastScrolledActiveIndex) return;
        this.lastScrolledActiveIndex = targetRow;
        this.virtualizer.scrollToIndex(targetRow, "auto");
    }

    private syncValidity(): void {
        if (!this.required || this.disabled || this.readOnly) {
            this.internals.setValidity({});
            return;
        }
        if (this.controller?.state.value === null) {
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

    private readonly handleTriggerClick = (): void => {
        if (this.disabled || this.readOnly) return;
        this.controller?.toggle();
    };

    private readonly handleSearchInput = (event: Event): void => {
        const input = event.currentTarget as HTMLInputElement;
        this.controller?.setQuery(input.value);
    };

    private readonly handleSearchKeyDown = (event: KeyboardEvent): void => {
        if (!this.controller) return;
        if (event.key === "ArrowDown") {
            event.preventDefault();
            this.controller.moveActive(1);
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

    private optionClasses(isActive: boolean, isDisabled: boolean | undefined): string {
        return [
            "select-box-option",
            isActive ? "select-box-option-active" : null,
            isDisabled ? "select-box-option-disabled" : null,
        ]
            .filter((value): value is string => value !== null)
            .join(" ");
    }

    override render(): TemplateResult {
        const state = this.controller?.state;
        if (!state) return html``;
        return html`
            <div class="select-box" part="root" data-select-root>
                <button
                    type="button"
                    class="select-box-trigger"
                    part="trigger"
                    aria-haspopup="listbox"
                    aria-expanded=${state.open}
                    aria-readonly=${this.readOnly}
                    ?disabled=${this.disabled}
                    data-select-trigger
                    @click=${this.handleTriggerClick}
                >
                    <span
                        part="value"
                        class=${state.selectedOption
                            ? "select-box-value"
                            : "select-box-value select-box-placeholder"}
                    >
                        ${state.selectedOption?.label ?? this.placeholder ?? "Select…"}
                    </span>
                    <span class="select-box-caret" part="caret" aria-hidden="true">▾</span>
                </button>
                ${state.open ? this.renderPopover(state) : nothing}
            </div>
        `;
    }

    private renderPopover(state: NonNullable<SelectBoxController<TExtra>["state"]>): TemplateResult {
        return html`
            <div class="select-box-popover" part="popover" role="listbox" data-select-popover>
                <input
                    class="select-box-search"
                    part="search"
                    type="text"
                    placeholder=${this.placeholder || "Search…"}
                    .value=${state.query}
                    data-select-search
                    @input=${this.handleSearchInput}
                    @keydown=${this.handleSearchKeyDown}
                />
                <div
                    ${ref(this.listRef)}
                    class="select-box-list"
                    part="list"
                    data-select-list
                    style="max-height: ${LIST_VIEWPORT_HEIGHT}px; overflow-y: auto;"
                >
                    ${state.isEmpty
                        ? html`<p class="select-box-empty" part="empty" data-select-empty>No matches</p>`
                        : this.renderVirtualRows(state.activeIndex)}
                </div>
            </div>
        `;
    }

    private renderVirtualRows(activeIndex: number): TemplateResult {
        if (this.virtualizer === null) return html``;
        const items = this.virtualizer.getVirtualItems();
        const totalSize = this.virtualizer.getTotalSize();
        const paddingTop = items[0]?.start ?? 0;
        const paddingBottom = Math.max(0, totalSize - (items.at(-1)?.end ?? 0));
        const activeRowIndex = this.rowModel.findRowIndexForActiveIndex(activeIndex);
        return html`
            <div style="padding-top: ${paddingTop}px; padding-bottom: ${paddingBottom}px;">
                ${items.map((virtualRow) => this.renderRow(virtualRow.index, activeRowIndex))}
            </div>
        `;
    }

    private renderRow(rowIndex: number, activeRowIndex: number): TemplateResult | typeof nothing {
        const row = this.rowModel.getRowAt(rowIndex);
        if (row === undefined) return nothing;
        if (row.kind === "header") {
            return html`
                <div
                    ${ref(this.handleRowRef)}
                    data-index=${rowIndex}
                    class="select-box-group-label"
                    data-select-group-label
                >
                    ${row.group.label}
                </div>
            `;
        }
        const isActive = rowIndex === activeRowIndex;
        return html`
            <button
                ${ref(this.handleRowRef)}
                data-index=${rowIndex}
                type="button"
                class=${this.optionClasses(isActive, row.option.disabled)}
                ?disabled=${row.option.disabled}
                data-select-option
                data-select-active=${isActive ? "" : nothing}
                @mousedown=${(event: Event) => event.preventDefault()}
                @click=${() => this.controller?.commitOption(row.option)}
            >
                ${row.option.label}
            </button>
        `;
    }
}
