import { SelectBoxElement } from "./select-box-element.js";

export { SelectBoxElement } from "./select-box-element.js";

export {
    SingleSelectBoxController,
    SubstringFilterStrategy,
    type AddonHookContext,
    type OptionFilterStrategy,
    type SelectBoxAddon,
    type SelectBoxAddonSnapshots,
    type SelectBoxSnapshot,
    type SelectGroup,
    type SelectOption,
    type SingleSelectBoxConfig,
} from "@select-box/core";

export const packageName = "@select-box/webcomponents" as const;

const TAG_NAME = "select-box";

/**
 * Registers `<select-box>` as a global custom element. Safe to call
 * multiple times — re-registration is skipped if the tag is already
 * defined. Importing the package triggers this side-effect; consumers
 * who want manual control should import `SelectBoxElement` directly
 * and call `customElements.define` themselves.
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

defineSelectBoxElement();
