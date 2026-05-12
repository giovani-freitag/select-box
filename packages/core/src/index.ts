export { SingleSelectBoxController } from "./controllers/single-select-box-controller.js";
export { FuzzyFilterStrategy, SubstringFilterStrategy, fuzzyScore } from "./filter.js";
export { indexOptionsByValue, normalizeOptionsToGroups, UNGROUPED_KEY } from "./normalize.js";
export { Store } from "./store.js";
export type { StoreListener } from "./store.js";
export {
    flattenGroupsForVirtualization,
    ListVirtualizer,
} from "./virtualizer/index.js";
export type {
    FlattenGroupsOptions,
    ListVirtualizerConfig,
    SelectBoxRow,
    VirtualRange,
    VirtualRow,
} from "./virtualizer/index.js";
export type {
    AddonHookContext,
    OptionFilterStrategy,
    SelectBoxAddon,
    SelectBoxAddonSnapshots,
    SelectBoxSnapshot,
    SelectGroup,
    SelectOption,
    SingleSelectBoxConfig,
} from "./types.js";

export const packageName = "@select-box/core" as const;
