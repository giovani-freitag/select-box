import { SelectBox } from "./SelectBox.js";

export { SelectBox } from "./SelectBox.js";
export { SelectBoxController } from "./select-box-controller.js";

const TAG_NAME = "select-box";

/**
 * Registers the Lit `SelectBox` as a custom element under the given tag; idempotent.
 */
export function defineSelectBoxElement(tagName: string = TAG_NAME): void {
    if (customElements.get(tagName)) return;
    customElements.define(tagName, SelectBox);
}

export {
    MultiSelectBoxController,
    SelectBoxKeyDispatcher,
    SelectBoxSnapshotView,
    SingleSelectBoxController,
    SubstringFilterStrategy,
    type AddonHookContext,
    type MultiSelectBoxControllerConfig,
    type OptionFilterStrategy,
    type SelectBoxAddon,
    type SelectBoxAddonSnapshots,
    type SelectBoxControllerConfig,
    type SelectBoxSnapshot,
    type SelectGroup,
    type SelectionMode,
    type SelectionValue,
    type SelectOption,
    type SingleSelectBoxControllerConfig,
} from "@select-box/core";

export const packageName = "@select-box/lit" as const;
