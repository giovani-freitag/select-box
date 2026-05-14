export {
    SelectBox,
    type SelectBoxMultiProps,
    type SelectBoxProps,
    type SelectBoxSingleProps,
} from "./SelectBox.js";
export { useSelectBox, type UseSelectBoxResult } from "./use-select-box.js";
export { useMultiSelectBox, type UseMultiSelectBoxResult } from "./use-multi-select-box.js";

export {
    MultiSelectBoxController,
    SelectBoxController,
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

export const packageName = "@select-box/react" as const;
