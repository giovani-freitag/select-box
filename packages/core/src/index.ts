export { SingleSelectBoxController } from "./controllers/single-select-box-controller.js";
export { SubstringFilterStrategy } from "./filter.js";
export { normalizeOptionsToGroups, UNGROUPED_KEY } from "./normalize.js";
export { Store } from "./store.js";
export type { StoreListener } from "./store.js";
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
