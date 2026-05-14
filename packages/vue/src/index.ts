export { default as SelectBox } from "./SelectBox.vue";
export type { SelectBoxProps, SelectBoxSurface } from "./SelectBox.vue";
export { useSelectBox, type UseSelectBoxResult } from "./use-select-box.js";
export { useMultiSelectBox, type UseMultiSelectBoxResult } from "./use-multi-select-box.js";

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

export const packageName = "@select-box/vue" as const;
