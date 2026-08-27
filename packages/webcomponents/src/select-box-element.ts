import {
    isMultiSelection,
    nextSelectBoxId,
    optionElementId,
    PopoverPlacementWatcher,
    SelectBoxController,
    SelectBoxKeyDispatcher,
    SelectBoxSnapshotView,
    type ClearControlView,
    type OptionFilterStrategy,
    type SelectBoxAddon,
    type SelectBoxSnapshot,
    type SelectionValue,
    type SelectionValueInput,
    type SelectOption,
} from "@select-box/core";
import {
    SelectBoxChipPainter,
    SelectBoxListPainter,
    SelectBoxNodeFactory,
} from "@select-box/dom";

import { encodeFormValue, parseFormState, type FormStateValue } from "./form-state.js";
import { renderSelectBox, type SelectBoxRefs } from "./render.js";

const OBSERVED_ATTRIBUTES = [
    "placeholder",
    "ungrouped-label",
    "name",
    "disabled",
    "required",
    "readonly",
    "multiple",
    "surface",
    "value",
    "empty-message",
] as const;

/**
 * Form-associated `<select-box>` custom element backed by the unified
 * `SelectBoxController`. Set the `multiple` attribute (or property) to switch
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
    private readonly instanceId = nextSelectBoxId();
    private keyDispatcher: SelectBoxKeyDispatcher<TExtra, SelectionValue> | null = null;
    private unsubscribeFromStore: (() => void) | null = null;
    private refs: SelectBoxRefs | null = null;
    private previousOpen = false;
    private readonly placement = new PopoverPlacementWatcher({ getRoot: () => this });
    private previousValueKey: string = SelectBoxSnapshotView.valueKey(null);

    private readonly nodeFactory: SelectBoxNodeFactory<TExtra>;
    private readonly listPainter: SelectBoxListPainter<TExtra>;
    private readonly chipPainter: SelectBoxChipPainter<TExtra>;

    private pendingOptions: ReadonlyArray<SelectOption<TExtra>> | undefined;
    private pendingAddons: ReadonlyArray<SelectBoxAddon<TExtra>> | undefined;
    private pendingFilter: OptionFilterStrategy<TExtra> | undefined;
    private pendingValue: SelectionValueInput = null;
    private seedApplied = false;

    constructor() {
        super();
        this.internals = this.attachInternals();
        this.nodeFactory = new SelectBoxNodeFactory<TExtra>({
            instanceId: this.instanceId,
            getController: () => this.coreController,
            refocus: () => this.refs?.input.focus({ preventScroll: true }),
        });
        this.listPainter = new SelectBoxListPainter<TExtra>({
            factory: this.nodeFactory,
            getListElement: () => this.refs?.list ?? null,
            onWindowChange: this.handleSnapshotChange,
            getEmptyMessage: () => this.getAttribute("empty-message") ?? undefined,
        });
        this.chipPainter = new SelectBoxChipPainter<TExtra>({
            factory: this.nodeFactory,
        });
    }

    connectedCallback(): void {
        // The host is this wrapper's root node, so it carries the root hook the
        // DOM-tree wrappers put on their outermost div.
        this.dataset["selectRoot"] = "";
        // Same root class the DOM-tree wrappers put on their outermost div, so a
        // single stylesheet reaches all five.
        this.classList.add("select-box");
        this.refs = renderSelectBox(this);
        this.refs.list.style.maxHeight = `${this.listPainter.viewportHeight}px`;
        this.refs.list.style.overflowY = "auto";
        this.applyModeAttribute();
        this.coreController = this.buildController();
        this.keyDispatcher = new SelectBoxKeyDispatcher(this.coreController);
        this.listPainter.mount();
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
        this.listPainter.dispose();
        this.placement.dispose();
    }

    attributeChangedCallback(name: string, _previous: string | null, _next: string | null): void {
        if (!this.refs) return;
        if (name === "placeholder" || name === "ungrouped-label") {
            this.handleSnapshotChange();
            return;
        }
        if (name === "multiple") {
            this.applyModeAttribute();
            this.applyModeToController();
            return;
        }
        if (name === "surface") {
            this.handleSnapshotChange();
            return;
        }
        // The attribute seeds the selection and the property reads the live one,
        // which is how `<input value>` has always split the two. A page can then
        // write `<select-box value="sp">` in markup instead of reaching for JS
        // after upgrade.
        if (name === "value") {
            this.applyValueAttribute();
            return;
        }
        if (name === "disabled" || name === "required" || name === "readonly") {
            // The controller owns the refusal; this element only mirrors its own
            // attributes into it.
            this.coreController?.setInteractivity({
                disabled: this.disabled,
                readOnly: this.readOnly,
            });
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
        const nextMode = this.multiple ? "multi" : "single";
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

    get multiple(): boolean {
        return this.hasAttribute("multiple");
    }

    set multiple(next: boolean) {
        if (next) this.setAttribute("multiple", "");
        else this.removeAttribute("multiple");
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
        this.coreController?.reset();
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
        if (this.coreController) {
            this.coreController.setOptions(next ?? []);
            // A seed in the markup names an option that usually only exists once
            // the list is assigned, so the value attribute is applied here rather
            // than at construction, where it would resolve against nothing.
            this.applySeedOnce();
        } else {
            this.rebuildControllerIfConnected();
        }
    }

    get value(): SelectionValue {
        const snapshot = this.coreController?.getState();
        if (snapshot) return snapshot.value;
        return this.multiple ? [] : null;
    }
    set value(next: SelectionValueInput) {
        this.pendingValue = next;
        // Owner-driven, so it goes through `setValue` rather than a commit: a
        // disabled `<select>` still accepts the value its page assigns, because
        // the attribute refuses the user, not the code.
        if (this.coreController) this.coreController.setValue(next);
        else this.rebuildControllerIfConnected();
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
        const mode = this.multiple ? "multi" : "single";
        if (this.getAttribute("mode") !== mode) this.setAttribute("mode", mode);
    }

    /**
     * The selection to start from: whatever was set through the property, or
     * the `value` attribute when the markup carried one.
     */
    private seededValue(): SelectionValueInput {
        const attribute = this.getAttribute("value");
        if (this.pendingValue !== null || attribute === null) return this.pendingValue;

        return this.multiple
            ? attribute.split(",").map((entry) => entry.trim()).filter(Boolean)
            : attribute;
    }

    /** Applies the markup seed the first time there are options to resolve it against. */
    private applySeedOnce(): void {
        if (this.seedApplied) return;
        const seeded = this.seededValue();
        if (seeded === null) return;

        this.seedApplied = true;
        this.coreController?.setValue(seeded);
    }

    /** Seeds the selection from the `value` attribute, if one is present. */
    private applyValueAttribute(): void {
        const attribute = this.getAttribute("value");
        if (attribute === null) return;

        const seeded: SelectionValueInput = this.multiple
            ? attribute.split(",").map((entry) => entry.trim()).filter(Boolean)
            : attribute;
        this.pendingValue = seeded;
        this.seedApplied = true;
        this.coreController?.setValue(seeded);
    }

    private buildController(): SelectBoxController<TExtra, SelectionValue> {
        return new SelectBoxController<TExtra, SelectionValue>({
            mode: this.multiple ? "multi" : "single",
            ...(this.pendingOptions !== undefined ? { options: this.pendingOptions } : {}),
            ...(this.pendingAddons !== undefined ? { addons: this.pendingAddons } : {}),
            ...(this.pendingFilter !== undefined ? { filter: this.pendingFilter } : {}),
            ungroupedLabel: this.getAttribute("ungrouped-label") ?? "",
            defaultValue: this.seededValue(),
            disabled: this.disabled,
            readOnly: this.readOnly,
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
        const input = event.currentTarget as HTMLInputElement;
        if (!this.coreController?.getState().open) this.coreController?.open();
        this.coreController?.setQuery(input.value);
    };

    private readonly handleInputFocus = (): void => {
        if (!this.coreController?.getState().open) this.coreController?.open();
    };

    private readonly handleInputClick = (): void => {
        if (!this.coreController?.getState().open) this.coreController?.open();
    };

    private readonly handleCaretMouseDown = (event: Event): void => {
        event.preventDefault();
    };

    private readonly handleCaretClick = (): void => {
        if (this.coreController?.getState().open) {
            this.coreController.close();
        } else {
            this.coreController?.open();
            this.refs?.input.focus({ preventScroll: true });
        }
    };

    private readonly handleTriggerMouseDown = (event: MouseEvent): void => {
        if (this.coreController?.getState().mode !== "multi") return;
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
        if (snapshot.open !== this.previousOpen) {
            this.previousOpen = snapshot.open;
            // Same shape as `change`: one event per transition, named for what
            // happened. A page can then react to the list opening without
            // reaching for the controller.
            this.dispatchEvent(new Event(snapshot.open ? "open" : "close", { bubbles: true }));
        }
        this.placement.sync(snapshot.open);
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

    /**
     * Copies the accessible name from the host onto the labelled node.
     *
     * @param host - Element the consumer labelled.
     * @param target - Node carrying the widget role.
     */
    private static mirrorLabel(host: HTMLElement, target: HTMLElement): void {
        for (const attribute of ["aria-label", "aria-labelledby", "aria-describedby"]) {
            const value = host.getAttribute(attribute);
            if (value === null) target.removeAttribute(attribute);
            else target.setAttribute(attribute, value);
        }
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
            this.chipPainter.paintInlineSurface(this.refs.inline, snapshot, view);
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
        // The host is what a consumer labels, but the input is what carries
        // role="combobox", so the label has to travel inward to be announced.
        SelectBoxElement.mirrorLabel(this, this.refs.input);
        // The combobox points at the highlighted row by id; focus never leaves it,
        // so this is the only thing a screen reader has to follow.
        const combobox = isMulti ? this.refs.trigger : this.refs.input;
        if (snapshot.activeOption === null) combobox.removeAttribute("aria-activedescendant");
        else {
            combobox.setAttribute(
                "aria-activedescendant",
                optionElementId(this.instanceId, snapshot.activeOption.value),
            );
        }
        this.refs.input.disabled = this.disabled;
        this.refs.input.readOnly = this.readOnly;

        this.chipPainter.paintTriggerChips(this.refs.tagsContainer, snapshot);
        this.refs.caret.hidden = isMulti;
        this.paintClearButton(view.clearControl);

        // The popover is the listbox, so multi-selectability is announced there —
        // the inline surface sets its own copy separately.
        this.refs.popover.setAttribute("aria-multiselectable", String(isMulti));
        this.refs.popover.hidden = !snapshot.open;
        if (!snapshot.open) return;

        this.listPainter.paint(snapshot, view);
    }

    private paintClearButton(control: ClearControlView): void {
        if (!this.refs) return;
        this.refs.clearButton.textContent = control.label;
        this.refs.clearButton.setAttribute("aria-label", control.ariaLabel);
        const visible = control.visible;
        if (visible) {
            this.refs.clearButton.removeAttribute("hidden");
            this.refs.clearButton.dataset["hasSelection"] = "";
        } else {
            this.refs.clearButton.setAttribute("hidden", "");
            delete this.refs.clearButton.dataset["hasSelection"];
        }
    }
}
