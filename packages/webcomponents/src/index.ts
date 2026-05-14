import { SelectBoxElement } from "./select-box-element.js";

export { SelectBoxElement } from "./select-box-element.js";

export {
    MultiSelectBoxController,
    SelectBoxController,
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

export const packageName = "@select-box/webcomponents" as const;

const TAG_NAME = "select-box";

/**
 * Registers `<select-box>` as a global custom element; idempotent.
 */
export function defineSelectBoxElement(tagName: string = TAG_NAME): void {
    if (customElements.get(tagName)) return;
    customElements.define(tagName, SelectBoxElement);
}

declare global {
    interface HTMLElementTagNameMap {
        "select-box": SelectBoxElement;
    }
}
