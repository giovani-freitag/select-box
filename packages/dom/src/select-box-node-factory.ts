import {
    optionElementId,
    SelectBoxSnapshotView,
    TextHighlighter,
    type RemoveControlView,
    type SelectBoxController,
    type SelectionValue,
    type SelectOption,
} from "@select-box/core";

/**
 * Config for {@link SelectBoxNodeFactory}.
 */
export interface SelectBoxNodeFactoryConfig<TExtra extends object> {
    /**
     * Id prefix every option row is keyed by, so a combobox elsewhere in the
     * markup can point `aria-activedescendant` at the same id.
     */
    readonly instanceId: string;
    /**
     * Resolves the live controller. Returns `null` while the wrapper sits
     * between mounts, in which case the produced nodes stay inert.
     */
    readonly getController: () => SelectBoxController<TExtra, SelectionValue> | null;
    /**
     * Hands focus back to the wrapper's own search input after a commit that
     * keeps the popover open.
     */
    readonly refocus: () => void;
}

/**
 * How a single option row renders right now.
 */
export interface OptionRowState {
    /** Row the keyboard cursor sits on. */
    readonly active: boolean;
    /** Row whose option is part of the current value. */
    readonly selected: boolean;
}

/**
 * Builds the light-DOM nodes of a select box and wires their listeners.
 *
 * Every node carries both its `select-box-*` class and its `data-select-*`
 * contract attribute, so consumer CSS and the test suites address the same
 * markup no matter which wrapper painted it.
 */
export class SelectBoxNodeFactory<TExtra extends object = object> {
    private readonly instanceId: string;
    private readonly getController: () => SelectBoxController<TExtra, SelectionValue> | null;
    private readonly refocus: () => void;

    constructor(config: SelectBoxNodeFactoryConfig<TExtra>) {
        this.instanceId = config.instanceId;
        this.getController = config.getController;
        this.refocus = config.refocus;
    }

    /**
     * A group's header row.
     *
     * @param label - Group name, already localized by the consumer.
     * @returns The header element.
     */
    createGroupHeader(label: string): HTMLDivElement {
        const header = document.createElement("div");
        header.className = "select-box-group-label";
        header.dataset["selectGroupLabel"] = "";
        // The group container carries the name, so announcing the header too
        // would say it twice. This is the visual half of the same thing.
        header.setAttribute("aria-hidden", "true");
        header.textContent = label;
        return header;
    }

    /**
     * A container that names the rows it holds, the way `<optgroup>` does.
     *
     * A bare `<div>` between a listbox and its options is not a valid child and
     * is dropped from the accessibility tree, which is what left the grouping
     * visible on screen and absent to a screen reader.
     *
     * @param label - Group name, already localized by the consumer.
     * @returns The container element, empty.
     */
    createGroupContainer(label: string): HTMLDivElement {
        const group = document.createElement("div");
        group.className = "select-box-group";
        // An unlabelled run still gets a container so every wrapper renders the
        // same shape, but `presentation` keeps it out of the way rather than
        // announcing a group with no name.
        group.setAttribute("role", label === "" ? "presentation" : "group");
        if (label !== "") group.setAttribute("aria-label", label);
        group.dataset["selectGroup"] = "";
        return group;
    }

    /**
     * An option row for the popover list.
     *
     * @param option - Option the row commits when clicked.
     * @param state - Active and selected flags for this paint.
     * @returns The row element, listeners attached.
     */
    createOptionRow(
        option: SelectOption<TExtra>,
        state: OptionRowState,
    ): HTMLButtonElement {
        const isMulti = this.isMulti();
        const button = document.createElement("button");
        button.type = "button";
        button.setAttribute("role", "option");
        button.setAttribute("aria-selected", String(state.selected));
        button.className = [
            "select-box-option",
            state.active ? "select-box-option-active" : null,
            state.selected && isMulti ? "select-box-option-selected" : null,
            option.disabled === true ? "select-box-option-disabled" : null,
        ]
            .filter((value): value is string => value !== null)
            .join(" ");
        // Rows are pointer and `aria-activedescendant` targets, never tab stops:
        // the focus ring stays on the input while the list is navigated.
        button.tabIndex = -1;
        button.id = optionElementId(this.instanceId, option.value);
        button.dataset["selectOption"] = "";
        if (state.active) button.dataset["selectActive"] = "";
        if (state.selected) button.dataset["selectSelected"] = "";
        // `aria-disabled` rather than the native attribute: the role is already
        // overridden to `option`, so the state belongs in ARIA beside it, and a
        // read-only control keeps rows focusable the way a readonly input is.
        // The refusal moves into the click handler, one path for the option's
        // own flag and the control's.
        if (option.disabled === true) button.setAttribute("aria-disabled", "true");
        if (isMulti) button.append(this.createTick(state.selected));
        button.append(...this.createLabelNodes(option.label));
        button.addEventListener("mousedown", (event) => event.preventDefault());
        button.addEventListener("click", () => this.commit(option));
        return button;
    }

    /**
     * A removable chip for the multi-mode trigger.
     *
     * @param option - Option the chip's remove button deselects.
     * @returns The chip element, listeners attached.
     */
    createSelectedChip(option: SelectOption<TExtra>): HTMLSpanElement {
        const chip = document.createElement("span");
        chip.className = "select-box-chip";
        chip.dataset["selectChip"] = "";
        chip.append(document.createTextNode(option.label));

        const control = this.removeControl();
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "select-box-chip-remove";
        remove.setAttribute("aria-label", control.ariaLabelFor(option.label));
        remove.dataset["selectChipRemove"] = "";
        remove.textContent = control.label;
        // Without this the trigger's own mousedown would reopen the popover
        // underneath the click that is removing the chip.
        remove.addEventListener("mousedown", (event) => event.stopPropagation());
        remove.addEventListener("click", (event) => {
            event.stopPropagation();
            this.getController()?.commitOption(option);
            this.refocus();
        });

        chip.append(remove);
        return chip;
    }

    /**
     * A toggleable chip for the inline surface.
     *
     * @param option - Option the chip toggles when clicked.
     * @param state - Selected flag for this paint.
     * @returns The chip element, listeners attached.
     */
    createSelectableChip(
        option: SelectOption<TExtra>,
        state: { readonly selected: boolean },
    ): HTMLButtonElement {
        const button = document.createElement("button");
        button.type = "button";
        button.setAttribute("role", "option");
        button.setAttribute("aria-selected", String(state.selected));
        button.setAttribute("aria-pressed", String(state.selected));
        button.className = [
            "select-box-chip",
            "select-box-chip-selectable",
            state.selected ? "select-box-chip-selected" : null,
            option.disabled === true ? "select-box-chip-disabled" : null,
        ]
            .filter((value): value is string => value !== null)
            .join(" ");
        button.dataset["selectChip"] = "";
        button.dataset["selectOption"] = "";
        if (state.selected) button.dataset["selectSelected"] = "";
        // The inline surface has no input to carry the control's own disabled
        // state, so each chip mirrors it — otherwise a disabled control still
        // takes clicks here.
        if (option.disabled === true || !this.isInteractive()) {
            button.setAttribute("aria-disabled", "true");
        }
        button.textContent = option.label;
        button.addEventListener("click", () => {
            if (option.disabled === true || !this.isInteractive()) return;
            this.getController()?.commitOption(option);
        });
        return button;
    }

    /**
     * The row shown when the query matches nothing.
     *
     * @param message - Already-localized empty-state text.
     * @returns The message element.
     */
    createEmptyState(message: string): HTMLParagraphElement {
        const empty = document.createElement("p");
        empty.className = "select-box-empty";
        empty.dataset["selectEmpty"] = "";
        empty.textContent = message;
        return empty;
    }

    private commit(option: SelectOption<TExtra>): void {
        const isMulti = this.isMulti();
        this.getController()?.commitOption(option);
        // Multi keeps the popover open for the next pick, so focus has to go
        // back to the input the click took it from.
        if (isMulti) this.refocus();
    }

    private createTick(selected: boolean): HTMLSpanElement {
        const tick = document.createElement("span");
        tick.className = "select-box-option-tick";
        tick.setAttribute("aria-hidden", "true");
        tick.textContent = selected ? "✓" : "";
        return tick;
    }

    private createLabelNodes(label: string): Node[] {
        const ranges = this.getController()?.getState().highlightRanges(label) ?? [];
        return TextHighlighter.split(label, ranges).map((chunk) => {
            if (!chunk.matched) return document.createTextNode(chunk.text);
            const mark = document.createElement("mark");
            mark.className = "select-box-option-match";
            mark.textContent = chunk.text;
            return mark;
        });
    }

    private isMulti(): boolean {
        return this.getController()?.mode === "multi";
    }

    /**
     * How the remove control should read right now.
     *
     * Derived from the live snapshot rather than hardcoded, so an addon that
     * translates the control reaches these nodes too.
     */
    private removeControl(): RemoveControlView {
        const state = this.getController()?.getState();
        if (state === undefined) {
            return {
                enabled: true,
                label: "×",
                ariaLabelFor: (optionLabel) => `Remove ${optionLabel}`,
            };
        }
        return new SelectBoxSnapshotView(state).removeControl;
    }

    private isInteractive(): boolean {
        const state = this.getController()?.getState();
        if (state === undefined) return false;
        return !state.disabled && !state.readOnly;
    }
}
