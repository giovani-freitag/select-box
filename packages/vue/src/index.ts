export { default as SelectBox } from "./SelectBox.vue";
export { useSelectBox, type UseSelectBoxResult } from "./use-select-box.js";

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

export const packageName = "@select-box/vue" as const;
