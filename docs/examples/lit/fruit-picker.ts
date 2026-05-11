import { SelectBoxController, type SelectGroup, type SelectOption } from "@select-box/lit";
import { html, LitElement, nothing, type TemplateResult } from "lit";

interface Fruit {
    readonly id: number;
    readonly name: string;
}

const fruits: ReadonlyArray<SelectOption<Fruit>> = [
    { value: { id: 1, name: "apple" }, label: "Apple", group: "Pomes" },
    { value: { id: 2, name: "pear" }, label: "Pear", group: "Pomes" },
    { value: { id: 3, name: "quince" }, label: "Quince", group: "Pomes" },
    { value: { id: 4, name: "peach" }, label: "Peach", group: "Stone fruits" },
    { value: { id: 5, name: "plum" }, label: "Plum", group: "Stone fruits" },
    { value: { id: 6, name: "cherry" }, label: "Cherry", group: "Stone fruits", disabled: true },
    { value: { id: 7, name: "lemon" }, label: "Lemon" },
    { value: { id: 8, name: "orange" }, label: "Orange" },
    { value: { id: 9, name: "lime" }, label: "Lime" },
];

/**
 * Sample LitElement that composes a `SelectBoxController` to drive its
 * own custom markup. Demonstrates the headless Lit API — the consumer
 * decides the DOM shape and emits a `valuechange` CustomEvent.
 *
 * Reuses the same global `.select-box-*` CSS the React and Vue examples
 * define so the visual matches across frameworks.
 */
export class FruitPicker extends LitElement {
    private readonly selectBox = new SelectBoxController<Fruit>(this, {
        options: fruits,
        ungroupedLabel: "Citrus",
    });

    private previousValue: Fruit | null = null;

    // Render into light DOM so the example's stylesheet applies.
    protected createRenderRoot(): HTMLElement {
        return this;
    }

    connectedCallback(): void {
        super.connectedCallback();
        document.addEventListener("mousedown", this.handleOutsideMouseDown);
    }

    disconnectedCallback(): void {
        super.disconnectedCallback();
        document.removeEventListener("mousedown", this.handleOutsideMouseDown);
    }

    protected updated(): void {
        const snapshot = this.selectBox.state;

        if (!Object.is(snapshot.value, this.previousValue)) {
            this.previousValue = snapshot.value;
            this.dispatchEvent(new CustomEvent("valuechange", { detail: { value: snapshot.value } }));
        }

        if (snapshot.open) {
            const search = this.querySelector<HTMLInputElement>("[data-select-search]");
            if (search && document.activeElement !== search) {
                search.focus({ preventScroll: true });
            }
        }
    }

    private readonly handleOutsideMouseDown = (event: MouseEvent): void => {
        if (!this.selectBox.state.open) return;
        if (!(event.target instanceof Node)) return;
        if (this.contains(event.target)) return;
        this.selectBox.close();
    };

    private readonly handleTriggerClick = (): void => {
        this.selectBox.toggle();
    };

    private readonly handleSearchInput = (event: Event): void => {
        const input = event.currentTarget as HTMLInputElement;
        this.selectBox.setQuery(input.value);
    };

    private readonly handleSearchKeyDown = (event: KeyboardEvent): void => {
        if (event.key === "ArrowDown") {
            event.preventDefault();
            this.selectBox.moveActive(1);
            return;
        }
        if (event.key === "ArrowUp") {
            event.preventDefault();
            this.selectBox.moveActive(-1);
            return;
        }
        if (event.key === "Enter") {
            event.preventDefault();
            this.selectBox.commitActive();
            return;
        }
        if (event.key === "Escape") {
            event.preventDefault();
            this.selectBox.close();
        }
    };

    render(): TemplateResult {
        const state = this.selectBox.state;
        return html`
            <div class="select-box" data-select-root>
                <button
                    type="button"
                    class="select-box-trigger"
                    aria-haspopup="listbox"
                    aria-expanded=${state.open}
                    data-select-trigger
                    @click=${this.handleTriggerClick}
                >
                    <span
                        class=${state.selectedOption
                            ? "select-box-value"
                            : "select-box-value select-box-placeholder"}
                    >
                        ${state.selectedOption?.label ?? "Search fruits…"}
                    </span>
                    <span class="select-box-caret" aria-hidden="true">▾</span>
                </button>

                ${state.open
                    ? html`
                          <div class="select-box-popover" role="listbox" data-select-popover>
                              <input
                                  class="select-box-search"
                                  type="text"
                                  placeholder="Search fruits…"
                                  .value=${state.query}
                                  data-select-search
                                  @input=${this.handleSearchInput}
                                  @keydown=${this.handleSearchKeyDown}
                              />
                              <div class="select-box-list" data-select-list>
                                  ${state.isEmpty
                                      ? html`<p class="select-box-empty" data-select-empty>
                                            No matches
                                        </p>`
                                      : this.renderGroups(state.filteredGroups, state.activeIndex)}
                              </div>
                          </div>
                      `
                    : nothing}
            </div>
        `;
    }

    private renderGroups(
        groups: ReadonlyArray<SelectGroup<Fruit>>,
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
                        const classes = [
                            "select-box-option",
                            isActive ? "select-box-option-active" : null,
                            option.disabled ? "select-box-option-disabled" : null,
                        ]
                            .filter((value): value is string => value !== null)
                            .join(" ");
                        return html`
                            <button
                                type="button"
                                class=${classes}
                                ?disabled=${option.disabled}
                                data-select-option
                                data-select-active=${isActive ? "" : nothing}
                                @mousedown=${(event: Event) => event.preventDefault()}
                                @click=${() => this.selectBox.commitOption(option)}
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
