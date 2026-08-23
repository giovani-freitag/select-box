import type {
    SelectBoxSnapshot,
    SelectBoxSnapshotView,
    SelectionValue,
} from "@select-box/core";

import type { SelectBoxNodeFactory } from "./select-box-node-factory.js";

/**
 * Config for {@link SelectBoxChipPainter}.
 */
export interface SelectBoxChipPainterConfig<TExtra extends object> {
    /** Builds the chips this painter places. */
    readonly factory: SelectBoxNodeFactory<TExtra>;
}

/**
 * Paints the chip areas of a select box: the trigger's selected chips and the
 * inline surface's toggleable ones.
 *
 * Both are full repaints from the snapshot rather than diffed updates — a chip
 * carries no state of its own, so rebuilding is cheaper than reconciling.
 */
export class SelectBoxChipPainter<TExtra extends object = object> {
    private readonly factory: SelectBoxNodeFactory<TExtra>;

    constructor(config: SelectBoxChipPainterConfig<TExtra>) {
        this.factory = config.factory;
    }

    /**
     * Repaints the selected chips inside the multi-mode trigger.
     *
     * @param container - The trigger's tag area, which also holds the input.
     * @param snapshot - Controller state to render.
     */
    paintTriggerChips(
        container: HTMLElement,
        snapshot: SelectBoxSnapshot<TExtra, SelectionValue>,
    ): void {
        // Addressed by the contract attribute, not the class: a chip that was
        // restyled must still be swept, or paints would stack duplicates.
        for (const chip of container.querySelectorAll("[data-select-chip]")) {
            chip.remove();
        }
        if (snapshot.mode !== "multi") return;

        const fragment = document.createDocumentFragment();
        for (const option of snapshot.selectedOptions) {
            fragment.append(this.factory.createSelectedChip(option));
        }
        // The input stays the last child so typing continues after the chips.
        container.insertBefore(
            fragment,
            container.querySelector("[data-select-input]"),
        );
    }

    /**
     * Repaints the inline surface, one toggleable chip per visible option.
     *
     * @param surface - The inline listbox element.
     * @param snapshot - Controller state to render.
     * @param view - Selection lookups derived from the same snapshot.
     */
    paintInlineSurface(
        surface: HTMLElement,
        snapshot: SelectBoxSnapshot<TExtra, SelectionValue>,
        view: SelectBoxSnapshotView<TExtra, SelectionValue>,
    ): void {
        if (snapshot.mode === "multi") {
            surface.setAttribute("aria-multiselectable", "true");
        } else {
            surface.removeAttribute("aria-multiselectable");
        }
        surface.replaceChildren();

        for (const group of snapshot.filteredGroups) {
            if (group.label !== "") {
                surface.append(this.factory.createGroupHeader(group.label));
            }
            const tags = document.createElement("div");
            tags.className = "select-box-tags";
            tags.dataset["selectTags"] = "";
            for (const option of group.options) {
                tags.append(
                    this.factory.createSelectableChip(option, {
                        selected: view.isSelected(option.value),
                    }),
                );
            }
            surface.append(tags);
        }
    }
}
