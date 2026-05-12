import {
    ListVirtualizer,
    SelectBoxRowModel,
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
const OPTION_ROW_HEIGHT = 36;
const HEADER_ROW_HEIGHT = 28;
const LIST_VIEWPORT_HEIGHT = 240;

/**
 * Form-associated `<select-box>` custom element backed by `SingleSelectBoxController`.
 */
export class SelectBoxElement<TExtra extends object = object> extends HTMLElement {
    static get observedAttributes(): ReadonlyArray<string> {
        return OBSERVED_ATTRIBUTES;
    }

    static readonly formAssociated = true;

    private readonly internals: ElementInternals;

    private controller: SingleSelectBoxController<TExtra> | null = null;
    private unsubscribeFromStore: (() => void) | null = null;
    private refs: SelectBoxShadowRefs | null = null;
    private previousValue: string | null = null;

    private listVirtualizer: ListVirtualizer | null = null;
    private rowModel: SelectBoxRowModel<TExtra> = new SelectBoxRowModel<TExtra>([]);
    private unsubscribeFromVirtualizer: (() => void) | null = null;
    private readonly rowHeightFn = (index: number): number =>
        this.rowHeightAt(this.rowModel, index);

    private pendingOptions: ReadonlyArray<SelectOption<TExtra>> | undefined;
    private pendingGroups: ReadonlyArray<SelectGroup<TExtra>> | undefined;
    private pendingAddons: ReadonlyArray<SelectBoxAddon<TExtra>> | undefined;
    private pendingFilter: OptionFilterStrategy<TExtra> | undefined;
    private pendingValue: string | null = null;

    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this.internals = this.attachInternals();
    }

    connectedCallback(): void {
        this.refs = renderSelectBoxShadow(this.shadowRoot!);
        this.refs.list.style.maxHeight = `${LIST_VIEWPORT_HEIGHT}px`;
        this.refs.list.style.overflowY = "auto";
        this.controller = new SingleSelectBoxController<TExtra>({
            ...(this.pendingOptions !== undefined ? { options: this.pendingOptions } : {}),
            ...(this.pendingGroups !== undefined ? { groups: this.pendingGroups } : {}),
            ...(this.pendingAddons !== undefined ? { addons: this.pendingAddons } : {}),
            ...(this.pendingFilter !== undefined ? { filter: this.pendingFilter } : {}),
            ungroupedLabel: this.getAttribute("ungrouped-label") ?? "",
            initialValue: this.pendingValue,
        });
        this.listVirtualizer = new ListVirtualizer({
            rowCount: 0,
            rowHeight: this.rowHeightFn,
            viewportHeight: LIST_VIEWPORT_HEIGHT,
        });
        this.unsubscribeFromVirtualizer = this.listVirtualizer.subscribe(this.handleSnapshotChange);
        this.previousValue = this.pendingValue;
        this.listen();
        this.handleSnapshotChange();
    }

    disconnectedCallback(): void {
        this.unlisten();
        this.controller?.destroy();
        this.controller = null;
        this.refs = null;
        this.unsubscribeFromVirtualizer?.();
        this.unsubscribeFromVirtualizer = null;
        this.listVirtualizer = null;
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
        this.pendingValue = parseFormState(state);
        this.rebuildControllerIfConnected();
    }

    get options(): ReadonlyArray<SelectOption<TExtra>> | undefined {
        return this.pendingOptions;
    }
    set options(next: ReadonlyArray<SelectOption<TExtra>> | undefined) {
        this.pendingOptions = next;
        this.rebuildControllerIfConnected();
    }

    get groups(): ReadonlyArray<SelectGroup<TExtra>> | undefined {
        return this.pendingGroups;
    }
    set groups(next: ReadonlyArray<SelectGroup<TExtra>> | undefined) {
        this.pendingGroups = next;
        this.rebuildControllerIfConnected();
    }

    get value(): string | null {
        return this.controller?.getState().value ?? this.pendingValue;
    }
    set value(next: string | number | null) {
        this.pendingValue = next === null ? null : String(next);
        this.rebuildControllerIfConnected();
    }

    /**
     * Full option object for the current value, including any extra payload.
     * `null` when nothing is selected (or the value points to an unknown option).
     */
    get selectedOption(): SelectOption<TExtra> | null {
        return this.controller?.getState().selectedOption ?? null;
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
        if (this.controller !== null && next !== undefined) {
            this.controller.setFilter(next);
            return;
        }
        this.rebuildControllerIfConnected();
    }

    private rebuildControllerIfConnected(): void {
        if (!this.isConnected || !this.refs) return;
        this.unlisten();
        this.controller?.destroy();
        this.controller = new SingleSelectBoxController<TExtra>({
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
        this.refs.list.addEventListener("scroll", this.handleListScroll, { passive: true });
        document.addEventListener("mousedown", this.handleOutsideMouseDown);
    }

    private unlisten(): void {
        this.unsubscribeFromStore?.();
        this.unsubscribeFromStore = null;
        this.refs?.trigger.removeEventListener("click", this.handleTriggerClick);
        this.refs?.search.removeEventListener("input", this.handleSearchInput);
        this.refs?.search.removeEventListener("keydown", this.handleSearchKeyDown);
        this.refs?.list.removeEventListener("scroll", this.handleListScroll);
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

    private readonly handleListScroll = (event: Event): void => {
        if (this.listVirtualizer === null) return;
        const list = event.currentTarget as HTMLDivElement;
        this.listVirtualizer.setScrollOffset(list.scrollTop);
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
        if (snapshot.value !== this.previousValue) {
            this.previousValue = snapshot.value;
            this.dispatchEvent(new Event("change", { bubbles: true }));
        }
    };

    private syncFormState(value: string | null): void {
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

    private paintSnapshot(snapshot: SelectBoxSnapshot<TExtra>): void {
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

    private paintList(snapshot: SelectBoxSnapshot<TExtra>): void {
        if (!this.refs || !this.listVirtualizer) return;

        // Sync virtualizer with the current snapshot BEFORE touching the DOM.
        // setRowCount may publish synchronously and re-enter paintList; doing
        // the sync first lets the re-entry render once, then the outer call
        // wipes via replaceChildren and re-renders idempotently.
        this.rowModel = new SelectBoxRowModel<TExtra>(snapshot.filteredGroups);
        this.listVirtualizer.setRowCount(this.rowModel.length);

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

        const range = this.listVirtualizer.getRange();
        const activeRowIndex = this.rowModel.findRowIndexForActiveIndex(snapshot.activeIndex);

        const wrapper = document.createElement("div");
        wrapper.style.paddingTop = `${range.paddingTop}px`;
        wrapper.style.paddingBottom = `${range.paddingBottom}px`;

        for (const virtualRow of range.visibleRows) {
            const row = this.rowModel.getRowAt(virtualRow.index);
            if (row === undefined) continue;
            if (row.kind === "header") {
                wrapper.append(this.createHeaderElement(row.group.label));
                continue;
            }
            wrapper.append(this.createOptionButton(row.option, virtualRow.index === activeRowIndex));
        }

        list.append(wrapper);
        this.scrollActiveOptionIntoView(list, activeRowIndex);
    }

    private createHeaderElement(label: string): HTMLDivElement {
        const header = document.createElement("div");
        header.className = "group-label";
        header.setAttribute("part", "group-label");
        header.style.height = `${HEADER_ROW_HEIGHT}px`;
        header.textContent = label;
        return header;
    }

    private createOptionButton(
        option: SelectOption<TExtra>,
        isActive: boolean,
    ): HTMLButtonElement {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "option";
        button.style.height = `${OPTION_ROW_HEIGHT}px`;
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
        return button;
    }

    private scrollActiveOptionIntoView(list: HTMLDivElement, activeRowIndex: number): void {
        if (this.listVirtualizer === null || activeRowIndex < 0) return;
        const targetOffset = this.listVirtualizer.getOffset(activeRowIndex);
        const targetHeight = this.rowHeightAt(this.rowModel, activeRowIndex);
        const viewportTop = list.scrollTop;
        const viewportBottom = viewportTop + list.clientHeight;
        if (targetOffset < viewportTop) {
            list.scrollTop = targetOffset;
            return;
        }
        if (targetOffset + targetHeight > viewportBottom) {
            list.scrollTop = targetOffset + targetHeight - list.clientHeight;
        }
    }

    private rowHeightAt(model: SelectBoxRowModel<TExtra>, index: number): number {
        return model.getRowAt(index)?.kind === "header" ? HEADER_ROW_HEIGHT : OPTION_ROW_HEIGHT;
    }
}
