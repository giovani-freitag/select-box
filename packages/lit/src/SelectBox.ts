import type {
    OptionFilterStrategy,
    SelectBoxAddon,
    SelectGroup,
    SelectOption,
} from "@select-box/core";
import { html, LitElement, nothing, type PropertyValues, type TemplateResult } from "lit";

import { SelectBoxController } from "./select-box-controller.js";

/**
 * Form-associated Lit select box; consumers register it under a tag of their choice.
 */
export class SelectBox<TExtra extends object = object> extends LitElement {
    static readonly formAssociated = true;

    static override readonly properties = {
        options: { attribute: false },
        groups: { attribute: false },
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
    groups?: ReadonlyArray<SelectGroup<TExtra>>;
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
    }

    override disconnectedCallback(): void {
        super.disconnectedCallback();
        document.removeEventListener("mousedown", this.handleOutsideMouseDown);
    }

    protected override willUpdate(changed: PropertyValues<this>): void {
        const rebuildOnlyChanges =
            changed.has("options") ||
            changed.has("groups") ||
            changed.has("addons") ||
            changed.has("ungroupedLabel");
        if (!this.controller || rebuildOnlyChanges) {
            this.rebuildController();
            return;
        }
        if (changed.has("filter") && this.filter !== undefined) {
            this.controller.setFilter(this.filter);
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
    }

    private rebuildController(): void {
        this.controller = new SelectBoxController<TExtra>(this, {
            ...(this.options !== undefined ? { options: this.options } : {}),
            ...(this.groups !== undefined ? { groups: this.groups } : {}),
            ...(this.addons !== undefined ? { addons: this.addons } : {}),
            ...(this.filter !== undefined ? { filter: this.filter } : {}),
            ungroupedLabel: this.ungroupedLabel,
        });
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
                <div class="select-box-list" part="list" data-select-list>
                    ${state.isEmpty
                        ? html`<p class="select-box-empty" part="empty" data-select-empty>No matches</p>`
                        : this.renderGroups(state.filteredGroups, state.activeIndex)}
                </div>
            </div>
        `;
    }

    private renderGroups(
        groups: ReadonlyArray<SelectGroup<TExtra>>,
        activeIndex: number,
    ): TemplateResult[] {
        let flatIndex = -1;
        return groups.map(
            (group) => html`
                <div class="select-box-group" data-select-group>
                    ${group.label
                        ? html`<div class="select-box-group-label">${group.label}</div>`
                        : nothing}
                    ${group.options.map((option) => {
                        const isSelectable = !option.disabled;
                        if (isSelectable) flatIndex += 1;
                        const isActive = isSelectable && flatIndex === activeIndex;
                        return html`
                            <button
                                type="button"
                                class=${this.optionClasses(isActive, option.disabled)}
                                ?disabled=${option.disabled}
                                data-select-option
                                data-select-active=${isActive ? "" : nothing}
                                @mousedown=${(event: Event) => event.preventDefault()}
                                @click=${() => this.controller?.commitOption(option)}
                            >
                                ${option.label}
                            </button>
                        `;
                    })}
                </div>
            `,
        );
    }
}
