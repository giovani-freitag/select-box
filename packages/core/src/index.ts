export { AbstractAddon } from "./addons/index.js";
export { SingleSelectBoxController } from "./controllers/single-select-box-controller.js";
export { AbstractFilterStrategy, SubstringFilterStrategy } from "./filters/index.js";
export { SelectBoxRowModel } from "./row-model.js";
export type { SelectBoxRow, SelectBoxRowModelOptions } from "./row-model.js";
export { Store } from "./store.js";
export type { StoreListener } from "./store.js";
export { TextHighlighter } from "./text-highlighter.js";
export type { HighlightChunk } from "./text-highlighter.js";
export { SelectBoxListVirtualizer } from "./virtualizer/index.js";
export type {
    SelectBoxListVirtualizerOptions,
    VirtualAlignment,
    VirtualItem,
} from "./virtualizer/index.js";
export type {
    AddonHookContext,
    OptionFilterStrategy,
    SearchMatchRange,
    SelectBoxAddon,
    SelectBoxAddonHost,
    SelectBoxAddonSnapshots,
    SelectBoxSnapshot,
    SelectGroup,
    SelectOption,
    SingleSelectBoxConfig,
} from "./types.js";

export const packageName = "@select-box/core" as const;
