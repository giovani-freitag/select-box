import {
    nextSelectBoxId,
    optionElementId,
    PopoverPlacementWatcher,
    SelectBoxController,
    SelectBoxKeyDispatcher,
    SelectBoxSnapshotView,
    type SelectBoxControllerConfig,
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

export type SelectBoxSurface = "popover" | "inline";

/**
 * The part of a select box that can be published on a plain DOM element.
 *
 * A global property cannot carry the view's `TExtra` parameter, so this handle
 * exposes only the members whose signatures do not mention it. Anything typed
 * by `TExtra` — the controller, the option list — stays on the instance the
 * plugin returns, where the compiler can still check it.
 */
export interface SelectBoxElementHandle {
    /** The element the view owns. */
    readonly root: HTMLElement;
    /** Opens the popover. */
    open(): void;
    /** Closes the popover. */
    close(): void;
    /** Opens the popover when closed, closes it when open. */
    toggle(): void;
    /** Drops the current selection. */
    clear(): void;
    /**
     * Switches between single and multi selection in place.
     *
     * @param mode - Selection mode to move to.
     */
    setMode(mode: "single" | "multi"): void;
    /**
     * Sets the selection on the caller's behalf.
     *
     * Applied even while the widget refuses input, the way a disabled `<select>`
     * still takes the value its page assigns. `clear()` is the user's gesture.
     *
     * @param value - Selection to hold; unknown or disabled keys are dropped.
     */
    setValue(value: SelectionValueInput): void;
    /** Tears the view down and takes its markup out of the document. */
    destroy(): void;
}

/**
 * Light-DOM select box view that wires a `SelectBoxController` into a host
 * element. Supports both single and multi modes via the config's `mode` flag,
 * and both `popover` and `inline` surfaces via the `surface` flag.
 */
export class SelectBoxView<TExtra extends object = object>
    implements SelectBoxElementHandle
{
    private readonly rootElement: HTMLDivElement;
    private readonly coreController: SelectBoxController<TExtra, SelectionValue>;
    private readonly keyDispatcher: SelectBoxKeyDispatcher<TExtra, SelectionValue>;
    private readonly surface: SelectBoxSurface;
    private readonly trigger: HTMLDivElement | null;
    private readonly tagsContainer: HTMLDivElement | null;
    private readonly input: HTMLInputElement | null;
    private readonly caret: HTMLButtonElement | null;
    private readonly clearButton: HTMLButtonElement | null;
    private readonly popover: HTMLDivElement | null;
    private readonly list: HTMLDivElement | null;

    /** Live mode flag — reflects the controller's current selection mode. */
    private get multiple(): boolean {
        return this.coreController.mode === "multi";
    }

    /**
     * The element this view owns.
     *
     * @returns The outermost node, marked `data-select-root`.
     */
    get root(): HTMLDivElement {
        // Read through rather than captured: a surface switch builds a different
        // root, and a node held by a consumer would dangle outside the tree.
        return this.rootElement;
    }

    /**
     * The controller driving this view.
     *
     * @returns The same instance the view renders from, so a call through it
     * repaints like any other change.
     */
    get controller(): SelectBoxController<TExtra, SelectionValue> {
        return this.coreController;
    }

    /**
     * Switches between single and multi selection in place.
     *
     * @param nextMode - Selection mode to move to.
     */
    setMode(nextMode: "single" | "multi"): void {
        this.coreController.setMode(nextMode);
    }

    /**
     * Sets the selection on the caller's behalf.
     *
     * Goes through the controller's owner-facing door rather than a commit, so a
     * disabled or read-only widget still shows what its page assigned.
     *
     * @param value - Selection to hold; unknown or disabled keys are dropped.
     */
    setValue(value: SelectionValueInput): void {
        this.coreController.setValue(value);
    }

    private readonly onDestroy: (() => void) | undefined;
    private destroyed = false;
    private unsubscribeFromStore: (() => void) | null = null;
    private previousOpen = false;
    private readonly placement = new PopoverPlacementWatcher({ getRoot: () => this.root });
    private previousValueKey: string;
    private readonly onSingleChange:
        | ((value: string | null, option: SelectOption<TExtra> | null) => void)
        | undefined;
    private readonly onOpenChange: ((open: boolean) => void) | undefined;
    private readonly onMultiChange:
        | ((
              values: ReadonlyArray<string>,
              options: ReadonlyArray<SelectOption<TExtra>>,
          ) => void)
        | undefined;
    private readonly placeholder: string;
    private readonly formMirror: HTMLSelectElement | null;
    private readonly inlineSurface: HTMLDivElement | null;
    private readonly instanceId = nextSelectBoxId();
    private readonly ariaLabel: string | undefined;
    private readonly ariaLabelledby: string | undefined;

    private readonly nodeFactory: SelectBoxNodeFactory<TExtra>;
    private readonly listPainter: SelectBoxListPainter<TExtra> | null;
    private readonly chipPainter: SelectBoxChipPainter<TExtra>;

    constructor(
        config: SelectBoxControllerConfig<TExtra> & {
            readonly placeholder?: string;
            readonly emptyMessage?: string;
            readonly surface?: SelectBoxSurface;
            readonly name?: string;
            readonly required?: boolean;
            readonly ariaLabel?: string;
            readonly ariaLabelledby?: string;
            readonly onValueChange?: (
                value: string | null,
                option: SelectOption<TExtra> | null,
            ) => void;
            readonly onMultiValueChange?: (
                values: ReadonlyArray<string>,
                options: ReadonlyArray<SelectOption<TExtra>>,
            ) => void;
            /** Fires whenever the popover opens or closes. */
            readonly onOpenChange?: (open: boolean) => void;
            /** Fires once the view has torn itself down, so an owner can drop its handle. */
            readonly onDestroy?: () => void;
        },
    ) {
        this.coreController = new SelectBoxController<TExtra, SelectionValue>(config);
        this.keyDispatcher = new SelectBoxKeyDispatcher(this.coreController);
        this.previousValueKey = SelectBoxSnapshotView.valueKey(this.coreController.getState().value);
        this.placeholder = config.placeholder ?? "Select…";
        this.formMirror = SelectBoxView.createFormMirror(config.name, config.required === true);
        this.ariaLabel = config.ariaLabel;
        this.ariaLabelledby = config.ariaLabelledby;
        this.onSingleChange = config.onValueChange;
        this.onMultiChange = config.onMultiValueChange;
        this.onOpenChange = config.onOpenChange;
        this.onDestroy = config.onDestroy;
        this.surface = config.surface ?? "popover";
        this.nodeFactory = new SelectBoxNodeFactory<TExtra>({
            instanceId: this.instanceId,
            getController: () => this.coreController,
            refocus: () => this.input?.focus({ preventScroll: true }),
        });
        this.chipPainter = new SelectBoxChipPainter<TExtra>({ factory: this.nodeFactory });

        this.rootElement = document.createElement("div");
        this.rootElement.dataset["selectRoot"] = "";
        this.rootElement.dataset["selectMode"] = this.multiple ? "multi" : "single";
        this.rootElement.className = this.computeRootClassName();

        if (this.surface === "inline") {
            this.inlineSurface = document.createElement("div");
            this.inlineSurface.className = "select-box-inline";
            this.inlineSurface.setAttribute("role", "listbox");
            this.inlineSurface.dataset["selectSurface"] = "inline";
            this.trigger = null;
            this.tagsContainer = null;
            this.input = null;
            this.caret = null;
            this.clearButton = null;
            this.popover = null;
            this.list = null;
            this.listPainter = null;
            this.rootElement.append(this.inlineSurface);
            if (this.formMirror) this.rootElement.append(this.formMirror);
            this.listen();
            this.paint(this.coreController.getState());
            return;
        }

        this.inlineSurface = null;
        this.trigger = this.createTrigger();
        this.tagsContainer = this.trigger.querySelector<HTMLDivElement>(".select-box-tags")!;
        this.input = this.trigger.querySelector<HTMLInputElement>(".select-box-input")!;
        this.caret = this.trigger.querySelector<HTMLButtonElement>(".select-box-caret")!;
        this.clearButton = this.trigger.querySelector<HTMLButtonElement>(".select-box-clear")!;
        this.popover = this.createPopover();
        this.list = this.popover.querySelector<HTMLDivElement>(".select-box-list")!;

        this.rootElement.append(this.trigger, this.popover);
        if (this.formMirror) this.rootElement.append(this.formMirror);
        this.listPainter = new SelectBoxListPainter<TExtra>({
            factory: this.nodeFactory,
            getListElement: () => this.list,
            onWindowChange: this.handleSnapshotChange,
            ...(config.emptyMessage !== undefined ? { emptyMessage: config.emptyMessage } : {}),
        });
        this.list.style.maxHeight = `${this.listPainter.viewportHeight}px`;
        this.list.style.overflowY = "auto";
        this.listPainter.mount();
        this.listen();
        this.paint(this.coreController.getState());
    }

    private computeRootClassName(): string {
        return [
            "select-box",
            this.multiple ? "select-box-multi" : null,
        ]
            .filter((value): value is string => value !== null)
            .join(" ");
    }

    /**
     * Tears the view down and takes its markup out of the document.
     *
     * Safe to call more than once; the second call is a no-op.
     */
    destroy(): void {
        if (this.destroyed) return;
        this.destroyed = true;
        this.unlisten();
        this.listPainter?.dispose();
        this.placement.dispose();
        this.coreController.destroy();
        this.rootElement.remove();
        this.onDestroy?.();
    }

    /**
     * Opens the popover.
     *
     * No visible effect on the inline surface, which has no popover — the open
     * flag still flips, so a later surface switch opens already-open.
     */
    open(): void {
        this.coreController.open();
    }

    /**
     * Closes the popover.
     */
    close(): void {
        this.coreController.close();
    }

    /**
     * Opens the popover when it is closed, closes it when it is open.
     */
    toggle(): void {
        this.coreController.toggle();
    }

    /**
     * Drops the current selection.
     *
     * Refused while the control is disabled or read-only, the same as a
     * selection made by hand.
     */
    clear(): void {
        this.coreController.clear();
    }

    /**
     * Replaces the option list, keeping whatever selection still applies.
     *
     * @param options - The new flat option list.
     */
    setOptions(options: ReadonlyArray<SelectOption<TExtra>>): void {
        this.coreController.setOptions(options);
    }

    /**
     * Builds the visually hidden native control that carries the widget into a form.
     *
     * Nothing about submission or constraint validation is reimplemented: the
     * browser sees a real `<select>` with a `name`, `required` and the selected
     * options, so submission, `required` blocking, `form.reset()` and autofill
     * all behave natively.
     *
     * @param name - Field name; a nameless control stays out of the form data.
     * @param required - Whether an empty selection blocks submission.
     * @returns The control, or null when there is no name to submit under.
     */
    private static createFormMirror(
        name: string | undefined,
        required: boolean,
    ): HTMLSelectElement | null {
        if (name === undefined || name === "") return null;
        const mirror = document.createElement("select");
        mirror.className = "select-box-form-mirror";
        mirror.dataset["selectFormMirror"] = "";
        mirror.setAttribute("aria-hidden", "true");
        mirror.tabIndex = -1;
        mirror.name = name;
        mirror.required = required;
        return mirror;
    }

    /**
     * Points the combobox role, its state and its label at whichever node owns
     * them in the current mode.
     *
     * Written on every paint rather than at construction: `setMode` moves the
     * role between the trigger and the input, and the node it left behind would
     * otherwise keep announcing a stale `aria-expanded`.
     *
     * @param open - Whether the popover is showing.
     * @param isMulti - Whether the trigger owns the role instead of the input.
     */
    private paintComboboxRole(open: boolean, isMulti: boolean): void {
        const combobox = isMulti ? this.trigger! : this.input!;
        const other = isMulti ? this.input! : this.trigger!;

        combobox.setAttribute("role", "combobox");
        combobox.setAttribute("aria-haspopup", "listbox");
        combobox.setAttribute("aria-expanded", String(open));
        if (this.ariaLabel !== undefined) combobox.setAttribute("aria-label", this.ariaLabel);
        if (this.ariaLabelledby !== undefined) {
            combobox.setAttribute("aria-labelledby", this.ariaLabelledby);
        }
        const active = this.coreController.getState().activeOption;
        if (active === null) combobox.removeAttribute("aria-activedescendant");
        else {
            combobox.setAttribute(
                "aria-activedescendant",
                optionElementId(this.instanceId, active.value),
            );
        }

        other.removeAttribute("aria-expanded");
        other.removeAttribute("aria-haspopup");
        other.removeAttribute("aria-label");
        other.removeAttribute("aria-labelledby");
        if (other === this.input) other.setAttribute("role", "searchbox");
        else other.removeAttribute("role");
    }

    /** Mirrors the snapshot into the native control the form reads. */
    private paintFormMirror(snapshot: SelectBoxSnapshot<TExtra, SelectionValue>): void {
        if (!this.formMirror) return;
        const isMulti = snapshot.mode === "multi";
        const selected = new Set(snapshot.selectedOptions.map((option) => option.value));
        this.formMirror.multiple = isMulti;
        this.formMirror.disabled = snapshot.disabled;
        // Only what submission needs: the chosen options, plus the empty one that
        // lets `required` fail while nothing is selected. Mirroring the whole list
        // would undo the windowing the popover does, and mirroring the filtered
        // list would drop the selection the moment a query excluded it.
        const entries = [
            ...(isMulti ? [] : [{ value: "", label: "" }]),
            ...snapshot.selectedOptions.map((option) => ({
                value: option.value,
                label: option.label,
            })),
        ];
        this.formMirror.replaceChildren(
            ...entries.map((entry) => {
                const option = document.createElement("option");
                option.value = entry.value;
                option.textContent = entry.label;
                option.selected = selected.has(entry.value);
                // The widget owns the reset, so the mirror's default is whatever
                // it currently holds: the browser's own reset then lands on the
                // same option the controller restores, whichever runs first.
                option.defaultSelected = option.selected;
                return option;
            }),
        );
    }

    private createTrigger(): HTMLDivElement {
        const trigger = document.createElement("div");
        trigger.className = "select-box-trigger";
        trigger.dataset["selectTrigger"] = "";

        const tags = document.createElement("div");
        tags.className = "select-box-tags";
        tags.dataset["selectTags"] = "";

        const input = document.createElement("input");
        input.type = "text";
        input.className = "select-box-input";
        input.setAttribute("aria-autocomplete", "list");
        input.dataset["selectInput"] = "";

        tags.append(input);

        const caret = document.createElement("button");
        caret.type = "button";
        caret.className = "select-box-caret";
        caret.dataset["selectCaret"] = "";
        caret.tabIndex = -1;
        caret.setAttribute("aria-hidden", "true");
        caret.textContent = "▾";

        const clear = document.createElement("button");
        clear.type = "button";
        clear.className = "select-box-clear";
        clear.tabIndex = -1;
        clear.setAttribute("aria-label", "Clear all");
        clear.dataset["selectClear"] = "";
        clear.textContent = "×";

        trigger.append(tags, caret, clear);
        return trigger;
    }

    private createPopover(): HTMLDivElement {
        const popover = document.createElement("div");
        popover.className = "select-box-popover";
        popover.setAttribute("role", "listbox");
        if (this.multiple) popover.setAttribute("aria-multiselectable", "true");
        popover.dataset["selectPopover"] = "";
        popover.hidden = true;

        const list = document.createElement("div");
        list.className = "select-box-list";
        list.dataset["selectList"] = "";

        popover.append(list);
        return popover;
    }

    private listen(): void {
        this.unsubscribeFromStore = this.coreController.subscribe(this.handleSnapshotChange);
        if (this.formMirror !== null) {
            document.addEventListener("reset", this.handleFormReset);
        }
        if (this.surface === "inline") return;
        this.input!.addEventListener("input", this.handleInputChange);
        this.input!.addEventListener("focus", this.handleInputFocus);
        this.input!.addEventListener("click", this.handleInputClick);
        this.input!.addEventListener("keydown", this.handleInputKeyDown);
        this.caret!.addEventListener("mousedown", this.handleCaretMouseDown);
        this.caret!.addEventListener("click", this.handleCaretClick);
        // Always attach the multi-mode listeners; they self-gate on the
        // controller's current mode so the view reacts when mode flips at runtime.
        this.trigger!.addEventListener("mousedown", this.handleTriggerMouseDown);
        this.clearButton!.addEventListener("mousedown", this.handleClearMouseDown);
        this.clearButton!.addEventListener("click", this.handleClearClick);
        document.addEventListener("mousedown", this.handleOutsideMouseDown);
    }

    private unlisten(): void {
        this.unsubscribeFromStore?.();
        this.unsubscribeFromStore = null;
        document.removeEventListener("reset", this.handleFormReset);
        if (this.surface === "inline") return;
        this.input?.removeEventListener("input", this.handleInputChange);
        this.input?.removeEventListener("focus", this.handleInputFocus);
        this.input?.removeEventListener("click", this.handleInputClick);
        this.input?.removeEventListener("keydown", this.handleInputKeyDown);
        this.caret?.removeEventListener("mousedown", this.handleCaretMouseDown);
        this.caret?.removeEventListener("click", this.handleCaretClick);
        this.trigger?.removeEventListener("mousedown", this.handleTriggerMouseDown);
        this.clearButton?.removeEventListener("mousedown", this.handleClearMouseDown);
        this.clearButton?.removeEventListener("click", this.handleClearClick);
        document.removeEventListener("mousedown", this.handleOutsideMouseDown);
    }

    /**
     * Clears the selection when the form holding the mirror is reset.
     *
     * Bound at the document rather than on the form: the view is built before
     * its root reaches the tree, so the mirror has no form owner yet and a
     * listener placed on it would attach to nothing. The filter asks the
     * resetting form whether the mirror is one of the controls it owns, which
     * is both the precise question and immune to a cross-realm identity check.
     */
    private readonly handleFormReset = (event: Event): void => {
        const mirror = this.formMirror;
        if (mirror === null) return;
        const form = event.target as HTMLFormElement | null;
        if (form === null || form.elements === undefined) return;
        if (!Array.from(form.elements).includes(mirror)) return;
        this.coreController.reset();
    };

    private readonly handleInputChange = (event: Event): void => {
        const input = event.currentTarget as HTMLInputElement;
        if (!this.coreController.getState().open) this.coreController.open();
        this.coreController.setQuery(input.value);
    };

    private readonly handleInputFocus = (): void => {
        if (!this.coreController.getState().open) this.coreController.open();
    };

    private readonly handleInputClick = (): void => {
        if (!this.coreController.getState().open) this.coreController.open();
    };

    private readonly handleCaretMouseDown = (event: Event): void => {
        event.preventDefault();
    };

    private readonly handleCaretClick = (): void => {
        if (this.coreController.getState().open) {
            this.coreController.close();
        } else {
            this.coreController.open();
            this.input?.focus({ preventScroll: true });
        }
    };

    private readonly handleTriggerMouseDown = (event: MouseEvent): void => {
        if (this.coreController.getState().mode !== "multi") return;
        if (event.target === this.input) return;
        if (event.target instanceof Element &&
            event.target.closest("[data-select-chip-remove], [data-select-clear]")) return;
        event.preventDefault();
        if (!this.coreController.getState().open) this.coreController.open();
        this.input?.focus({ preventScroll: true });
    };

    /** Whether the clear control is on screen, from the same slice that paints it. */
    private get clearControlVisible(): boolean {
        return new SelectBoxSnapshotView(this.coreController.getState()).clearControl.visible;
    }

    private readonly handleClearMouseDown = (event: Event): void => {
        // Gated on the control being offered, not on the mode: an addon puts it
        // in single mode too, and reading the mode instead left it painted and
        // inert there.
        if (!this.clearControlVisible) return;
        event.preventDefault();
        event.stopPropagation();
    };

    private readonly handleClearClick = (event: Event): void => {
        if (!this.clearControlVisible) return;
        event.stopPropagation();
        this.coreController.clear();
        this.input?.focus({ preventScroll: true });
    };

    private readonly handleInputKeyDown = (event: KeyboardEvent): void => {
        if (this.keyDispatcher.dispatch(event.key) === "handled") {
            event.preventDefault();
        }
    };

    private readonly handleOutsideMouseDown = (event: MouseEvent): void => {
        if (!this.coreController.getState().open) return;
        if (!(event.target instanceof Node)) return;
        if (this.rootElement.contains(event.target)) return;
        this.coreController.close();
    };

    private readonly handleSnapshotChange = (): void => {
        const snapshot = this.coreController.getState();
        this.paint(snapshot);
        const currentKey = SelectBoxSnapshotView.valueKey(snapshot.value);
        if (currentKey !== this.previousValueKey) {
            this.previousValueKey = currentKey;
            if (snapshot.mode === "multi") {
                this.onMultiChange?.(
                    snapshot.value as ReadonlyArray<string>,
                    snapshot.selectedOptions,
                );
            } else {
                this.onSingleChange?.(
                    snapshot.value as string | null,
                    snapshot.selectedOption,
                );
            }
        }
        if (snapshot.open !== this.previousOpen) {
            this.previousOpen = snapshot.open;
            // Same shape as the change notification: one call per transition,
            // which the plugin turns into a real jQuery event.
            this.onOpenChange?.(snapshot.open);
        }
        this.placement.sync(snapshot.open);
    };

    private paint(snapshot: SelectBoxSnapshot<TExtra, SelectionValue>): void {
        const view = new SelectBoxSnapshotView(snapshot);
        const isMulti = snapshot.mode === "multi";

        // Keep host-level mode markers in sync so consumer CSS can branch on them.
        if (isMulti) {
            this.rootElement.classList.add("select-box-multi");
        } else {
            this.rootElement.classList.remove("select-box-multi");
        }
        this.rootElement.dataset["selectMode"] = snapshot.mode;
        this.paintFormMirror(snapshot);

        if (this.surface === "inline") {
            this.chipPainter.paintInlineSurface(this.inlineSurface!, snapshot, view);
            return;
        }

        this.setTriggerButtonPresent(this.caret!, !isMulti);
        if (isMulti) this.popover!.setAttribute("aria-multiselectable", "true");
        else this.popover!.removeAttribute("aria-multiselectable");

        const inputValue = view.triggerInputValue;
        if (this.input!.value !== inputValue) {
            this.input!.value = inputValue;
        }
        // The browser resets a text input to its attribute default, so the
        // default has to follow the painted text — otherwise a form reset blanks
        // the trigger while the controller still holds a selection.
        this.input!.defaultValue = inputValue;
        const hasSelection = snapshot.selectedOptions.length > 0;
        const clearControl = view.clearControl;
        this.clearButton!.textContent = clearControl.label;
        this.clearButton!.setAttribute("aria-label", clearControl.ariaLabel);
        this.input!.disabled = snapshot.disabled;
        this.input!.readOnly = snapshot.readOnly;
        if (snapshot.readOnly) this.input!.setAttribute("aria-readonly", "true");
        else this.input!.removeAttribute("aria-readonly");
        this.input!.placeholder = isMulti
            ? (hasSelection ? "" : this.placeholder)
            : (snapshot.open && snapshot.selectedOption
                ? snapshot.selectedOption.label
                : this.placeholder);

        this.paintComboboxRole(snapshot.open, isMulti);

        this.chipPainter.paintTriggerChips(this.tagsContainer!, snapshot);
        this.setTriggerButtonPresent(this.clearButton!, view.clearControl.visible);

        this.popover!.hidden = !snapshot.open;
        if (!snapshot.open) return;

        this.listPainter!.paint(snapshot, view);
    }

    /**
     * Attaches or detaches one of the trigger's trailing buttons.
     *
     * Presence in the tree, not the `hidden` attribute, is what drives
     * visibility here: `hidden` resolves to `display: none` only through the
     * user-agent stylesheet, so any consumer rule setting `display` on the
     * same element silently outranks it.
     */
    private setTriggerButtonPresent(button: HTMLButtonElement, present: boolean): void {
        if (present === (button.parentNode === this.trigger)) return;
        if (present) this.trigger!.append(button);
        else button.remove();
    }
}
