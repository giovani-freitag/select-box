export { AbstractAddon } from "./addons/index.js";
export { SingleSelectBoxController } from "./controllers/single-select-box-controller.js";
export { AbstractFilterStrategy, SubstringFilterStrategy } from "./filters/index.js";
export { SelectBoxRowModel } from "./row-model.js";
export type { SelectBoxRow, SelectBoxRowModelConfig } from "./row-model.js";
export { Store } from "./store.js";
export type { StoreConfig, StoreListener } from "./store.js";
export { TextHighlighter } from "./text-highlighter.js";
export type { HighlightChunk } from "./text-highlighter.js";
export { SelectBoxListVirtualizer } from "./virtualizer/index.js";
export type {
    SelectBoxListVirtualizerConfig,
    VirtualAlignment,
    VirtualItem,
} from "./virtualizer/index.js";
export type {
    AddonHookContext,
    OptionFilterStrategy,
    SearchMatchRange,
    SelectBoxAddon,
    SelectBoxAddonSnapshots,
    SelectBoxSnapshot,
    SelectGroup,
    SelectOption,
    SingleSelectBoxControllerConfig,
} from "./types.js";

export const packageName = "@select-box/core" as const;
