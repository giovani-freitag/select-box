import {
    SelectBoxListVirtualizer,
    SelectBoxRowModel,
    SingleSelectBoxController,
    type OptionFilterStrategy,
    type SelectBoxAddon,
    type SelectBoxSnapshot,
    type SelectOption,
} from "@select-box/core";

import { encodeFormValue, parseFormState, type FormStateValue } from "./form-state.js";
import { renderSelectBoxShadow, type SelectBoxShadowRefs } from "./render.js";

const OBSERVED_ATTRIBUTES = ["placeholder", "ungrouped-label", "name", "disabled", "required", "readonly"] as const;
const ESTIMATED_OPTION_HEIGHT = 36;
const ESTIMATED_HEADER_HEIGHT = 28;
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

    private listVirtualizer: SelectBoxListVirtualizer | null = null;
    private rowModel: SelectBoxRowModel<TExtra> = new SelectBoxRowModel<TExtra>({ groups: [] });
    private lastRowModelSource: ReadonlyArray<unknown> | null = null;
    private unsubscribeFromVirtualizer: (() => void) | null = null;
    private lastScrolledActiveIndex = -1;
    private listInnerWrapper: HTMLDivElement | null = null;

    private pendingOptions: ReadonlyArray<SelectOption<TExtra>> | undefined;
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
            ...(this.pendingAddons !== undefined ? { addons: this.pendingAddons } : {}),
            ...(this.pendingFilter !== undefined ? { filter: this.pendingFilter } : {}),
            ungroupedLabel: this.getAttribute("ungrouped-label") ?? "",
            initialValue: this.pendingValue,
        });
        this.listVirtualizer = new SelectBoxListVirtualizer({
            getScrollElement: () => this.refs?.list ?? null,
            getCount: () => this.rowModel.length,
            estimateSize: (index) => this.estimateRowSize(this.rowModel, index),
            initialViewportHeight: LIST_VIEWPORT_HEIGHT,
        });
        this.listVirtualizer.mount();
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
        this.listVirtualizer?.dispose();
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
        this.refs.input.addEventListener("input", this.handleInputChange);
        this.refs.input.addEventListener("focus", this.handleInputFocus);
        this.refs.input.addEventListener("click", this.handleInputClick);
        this.refs.input.addEventListener("keydown", this.handleInputKeyDown);
        this.refs.caret.addEventListener("mousedown", this.handleCaretMouseDown);
        this.refs.caret.addEventListener("click", this.handleCaretClick);
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
        document.removeEventListener("mousedown", this.handleOutsideMouseDown);
    }

    private readonly handleInputChange = (event: Event): void => {
        if (this.disabled || this.readOnly) return;
        const input = event.currentTarget as HTMLInputElement;
        if (!this.controller?.getState().open) this.controller?.open();
        this.controller?.setQuery(input.value);
    };

    private readonly handleInputFocus = (): void => {
        if (this.disabled || this.readOnly) return;
        if (!this.controller?.getState().open) this.controller?.open();
    };

    private readonly handleInputClick = (): void => {
        if (this.disabled || this.readOnly) return;
        if (!this.controller?.getState().open) this.controller?.open();
    };

    private readonly handleCaretMouseDown = (event: Event): void => {
        // Keep the input focused when the caret is clicked.
        event.preventDefault();
    };

    private readonly handleCaretClick = (): void => {
        if (this.disabled || this.readOnly) return;
        if (this.controller?.getState().open) {
            this.controller.close();
        } else {
            this.controller?.open();
            this.refs?.input.focus({ preventScroll: true });
        }
    };

    private readonly handleInputKeyDown = (event: KeyboardEvent): void => {
        if (!this.controller) return;
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
                this.refs?.input,
            );
            return;
        }
        this.internals.setValidity({});
    }

    private paintSnapshot(snapshot: SelectBoxSnapshot<TExtra>): void {
        if (!this.refs) return;
        const placeholder = this.getAttribute("placeholder") ?? "Select…";

        const inputValue = snapshot.open ? snapshot.query : (snapshot.selectedOption?.label ?? "");
        if (this.refs.input.value !== inputValue) {
            this.refs.input.value = inputValue;
        }
        // While the popover is open with a selection, show the chosen label as
        // placeholder so the user sees what was picked while filtering.
        this.refs.input.placeholder = snapshot.open && snapshot.selectedOption
            ? snapshot.selectedOption.label
            : placeholder;
        this.refs.input.setAttribute("aria-expanded", String(snapshot.open));
        this.refs.input.setAttribute("aria-readonly", String(this.readOnly));
        this.refs.input.disabled = this.disabled;

        this.refs.popover.hidden = !snapshot.open;
        if (!snapshot.open) return;

        this.paintList(snapshot);
    }

    private paintList(snapshot: SelectBoxSnapshot<TExtra>): void {
        if (!this.refs || !this.listVirtualizer) return;

        // Sync the virtualizer with the new row count BEFORE rendering — TanStack
        // recomputes virtual items from the count + estimateSize the moment we ask.
        if (snapshot.filteredGroups !== this.lastRowModelSource) {
            this.rowModel = new SelectBoxRowModel<TExtra>({ groups: snapshot.filteredGroups });
            this.lastRowModelSource = snapshot.filteredGroups;
        }
        this.listVirtualizer.sync();

        const list = this.refs.list;

        if (snapshot.isEmpty) {
            const empty = document.createElement("p");
            empty.className = "empty";
            empty.setAttribute("part", "empty");
            empty.dataset["selectEmpty"] = "";
            empty.textContent = "No matches";
            list.replaceChildren(empty);
            this.listInnerWrapper = null;
            return;
        }

        // Keep a stable inner wrapper anchored to `list` — never remove it
        // between paints. Wiping the list and re-appending mid-paint shrinks
        // `list.scrollHeight` to 0 and the browser clamps `scrollTop` to 0,
        // which manifests as a scroll-reset flicker every time the user drags.
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
        header.className = "group-label";
        header.setAttribute("part", "group-label");
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

    private estimateRowSize(model: SelectBoxRowModel<TExtra>, index: number): number {
        return model.getRowAt(index)?.kind === "header"
            ? ESTIMATED_HEADER_HEIGHT
            : ESTIMATED_OPTION_HEIGHT;
    }
}
