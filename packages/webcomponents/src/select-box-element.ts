import {
    SingleSelectBoxController,
    type OptionFilterStrategy,
    type SelectBoxAddon,
    type SelectBoxSnapshot,
    type SelectGroup,
    type SelectOption,
} from "@select-box/core";

import { encodeFormValue, parseFormState, type FormStateValue } from "./form-state.js";
import { renderSelectBoxShadow, type SelectBoxShadowRefs } from "./render.js";

const OBSERVED_ATTRIBUTES = ["placeholder", "ungrouped-label", "name", "disabled", "required", "readonly"] as const;

/**
 * Form-associated `<select-box>` custom element backed by `SingleSelectBoxController`.
 */
export class SelectBoxElement<TValue = unknown> extends HTMLElement {
    static get observedAttributes(): ReadonlyArray<string> {
        return OBSERVED_ATTRIBUTES;
    }

    static readonly formAssociated = true;

    private readonly internals: ElementInternals;

    private controller: SingleSelectBoxController<TValue> | null = null;
    private unsubscribeFromStore: (() => void) | null = null;
    private refs: SelectBoxShadowRefs | null = null;
    private previousValue: TValue | null = null;

    private pendingOptions: ReadonlyArray<SelectOption<TValue>> | undefined;
    private pendingGroups: ReadonlyArray<SelectGroup<TValue>> | undefined;
    private pendingAddons: ReadonlyArray<SelectBoxAddon<TValue>> | undefined;
    private pendingFilter: OptionFilterStrategy<TValue> | undefined;
    private pendingValue: TValue | null = null;

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this.internals = this.attachInternals();
    }

    connectedCallback(): void {
        this.refs = renderSelectBoxShadow(this.shadowRoot!);
        this.controller = new SingleSelectBoxController<TValue>({
            ...(this.pendingOptions !== undefined ? { options: this.pendingOptions } : {}),
            ...(this.pendingGroups !== undefined ? { groups: this.pendingGroups } : {}),
            ...(this.pendingAddons !== undefined ? { addons: this.pendingAddons } : {}),
            ...(this.pendingFilter !== undefined ? { filter: this.pendingFilter } : {}),
            ungroupedLabel: this.getAttribute("ungrouped-label") ?? "",
            initialValue: this.pendingValue,
        });
        this.previousValue = this.pendingValue;
        this.listen();
        this.handleSnapshotChange();
    }

    disconnectedCallback(): void {
        this.unlisten();
        this.controller?.destroy();
        this.controller = null;
        this.refs = null;
    }

    attributeChangedCallback(name: string, _previous: string | null, _next: string | null): void {
        if (!this.refs) return;
        if (name === "placeholder" || name === "ungrouped-label") {
            this.handleSnapshotChange();
            return;
        }
        if (name === "disabled" || name === "required" || name === "readonly") {
            this.syncValidity();
            this.handleSnapshotChange();
        }
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
        this.controller?.clear();
        this.pendingValue = null;
    }

    formDisabledCallback(disabled: boolean): void {
        if (disabled) this.setAttribute("disabled", "");
        else this.removeAttribute("disabled");
    }

    formStateRestoreCallback(state: FormStateValue, _mode: "restore" | "autocomplete"): void {
        const restored = parseFormState<TValue>(state);
        this.pendingValue = restored;
        this.rebuildControllerIfConnected();
    }

    get options(): ReadonlyArray<SelectOption<TValue>> | undefined {
        return this.pendingOptions;
    }
    set options(next: ReadonlyArray<SelectOption<TValue>> | undefined) {
        this.pendingOptions = next;
        this.rebuildControllerIfConnected();
    }

    get groups(): ReadonlyArray<SelectGroup<TValue>> | undefined {
        return this.pendingGroups;
    }
    set groups(next: ReadonlyArray<SelectGroup<TValue>> | undefined) {
        this.pendingGroups = next;
        this.rebuildControllerIfConnected();
    }

    get value(): TValue | null {
        return this.controller?.getState().value ?? this.pendingValue;
    }
    set value(next: TValue | null) {
        this.pendingValue = next;
        this.rebuildControllerIfConnected();
    }

    get addons(): ReadonlyArray<SelectBoxAddon<TValue>> | undefined {
        return this.pendingAddons;
    }
    set addons(next: ReadonlyArray<SelectBoxAddon<TValue>> | undefined) {
        this.pendingAddons = next;
        this.rebuildControllerIfConnected();
    }

    get filter(): OptionFilterStrategy<TValue> | undefined {
        return this.pendingFilter;
    }
    set filter(next: OptionFilterStrategy<TValue> | undefined) {
        this.pendingFilter = next;
        this.rebuildControllerIfConnected();
    }

    private rebuildControllerIfConnected(): void {
        if (!this.isConnected || !this.refs) return;
        this.unlisten();
        this.controller?.destroy();
        this.controller = new SingleSelectBoxController<TValue>({
            ...(this.pendingOptions !== undefined ? { options: this.pendingOptions } : {}),
            ...(this.pendingGroups !== undefined ? { groups: this.pendingGroups } : {}),
            ...(this.pendingAddons !== undefined ? { addons: this.pendingAddons } : {}),
            ...(this.pendingFilter !== undefined ? { filter: this.pendingFilter } : {}),
            ungroupedLabel: this.getAttribute("ungrouped-label") ?? "",
            initialValue: this.pendingValue,
        });
        this.previousValue = this.pendingValue;
        this.listen();
        this.handleSnapshotChange();
    }

    private listen(): void {
        if (!this.refs || !this.controller) return;
        this.unsubscribeFromStore = this.controller.subscribe(this.handleSnapshotChange);
        this.refs.trigger.addEventListener("click", this.handleTriggerClick);
        this.refs.search.addEventListener("input", this.handleSearchInput);
        this.refs.search.addEventListener("keydown", this.handleSearchKeyDown);
        document.addEventListener("mousedown", this.handleOutsideMouseDown);
    }

    private unlisten(): void {
        this.unsubscribeFromStore?.();
        this.unsubscribeFromStore = null;
        this.refs?.trigger.removeEventListener("click", this.handleTriggerClick);
        this.refs?.search.removeEventListener("input", this.handleSearchInput);
        this.refs?.search.removeEventListener("keydown", this.handleSearchKeyDown);
        document.removeEventListener("mousedown", this.handleOutsideMouseDown);
    }

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

    private readonly handleOutsideMouseDown = (event: MouseEvent): void => {
        if (!this.controller?.getState().open) return;
        const path = event.composedPath();
        if (path.includes(this)) return;
        this.controller.close();
    };

    private readonly handleSnapshotChange = (): void => {
        if (!this.refs || !this.controller) return;
        const snapshot = this.controller.getState();
        this.paintSnapshot(snapshot);
        this.syncFormState(snapshot.value);
        if (!Object.is(snapshot.value, this.previousValue)) {
            this.previousValue = snapshot.value;
            this.dispatchEvent(new Event("change", { bubbles: true }));
        }
    };

    private syncFormState(value: TValue | null): void {
        const formValue = encodeFormValue(value);
        this.internals.setFormValue(formValue, formValue);
        this.syncValidity();
    }

    private syncValidity(): void {
        if (!this.required || this.disabled || this.readOnly) {
            this.internals.setValidity({});
            return;
        }
        const value = this.controller?.getState().value ?? null;
        if (value === null) {
            this.internals.setValidity(
                { valueMissing: true },
                "Please pick an option.",
                this.refs?.trigger,
            );
            return;
        }
        this.internals.setValidity({});
    }

    private paintSnapshot(snapshot: SelectBoxSnapshot<TValue>): void {
        if (!this.refs) return;
        const placeholder = this.getAttribute("placeholder") ?? "Select…";

        this.refs.value.textContent = snapshot.selectedOption?.label ?? placeholder;
        this.refs.value.classList.toggle("placeholder", snapshot.selectedOption === null);
        this.refs.trigger.setAttribute("aria-expanded", String(snapshot.open));
        this.refs.trigger.setAttribute("aria-readonly", String(this.readOnly));
        this.refs.trigger.disabled = this.disabled;

        this.refs.popover.hidden = !snapshot.open;
        if (!snapshot.open) {
            this.refs.search.value = "";
            return;
        }

        if (this.refs.search.value !== snapshot.query) {
            this.refs.search.value = snapshot.query;
        }
        this.refs.search.placeholder = placeholder;
        this.paintList(snapshot);

        if (document.activeElement !== this.refs.search) {
            this.refs.search.focus({ preventScroll: true });
        }
    }

    private paintList(snapshot: SelectBoxSnapshot<TValue>): void {
        if (!this.refs) return;
        const list = this.refs.list;
        list.replaceChildren();

        if (snapshot.isEmpty) {
            const empty = document.createElement("p");
            empty.className = "empty";
            empty.setAttribute("part", "empty");
            empty.dataset["selectEmpty"] = "";
            empty.textContent = "No matches";
            list.append(empty);
            return;
        }

        let flatIndex = -1;
        for (const group of snapshot.filteredGroups) {
            const groupElement = document.createElement("div");
            groupElement.className = "group";
            groupElement.setAttribute("part", "group");
            groupElement.dataset["selectGroup"] = "";

            if (group.label) {
                const label = document.createElement("div");
                label.className = "group-label";
                label.setAttribute("part", "group-label");
                label.textContent = group.label;
                groupElement.append(label);
            }

            for (const option of group.options) {
                const isSelectable = !option.disabled;
                if (isSelectable) flatIndex += 1;
                const isActive = isSelectable && flatIndex === snapshot.activeIndex;

                const button = document.createElement("button");
                button.type = "button";
                button.className = "option";
                const parts = ["option"];
                if (isActive) parts.push("option-active");
                if (option.disabled) parts.push("option-disabled");
                button.setAttribute("part", parts.join(" "));
                button.dataset["selectOption"] = "";
                if (isActive) {
                    button.classList.add("active");
                    button.dataset["selectActive"] = "";
                }
                if (option.disabled) {
                    button.classList.add("disabled");
                    button.disabled = true;
                }
                button.textContent = option.label;
                button.addEventListener("mousedown", (event) => event.preventDefault());
                button.addEventListener("click", () => {
                    this.controller?.commitOption(option);
                });
                groupElement.append(button);
            }

            list.append(groupElement);
        }
    }
}
