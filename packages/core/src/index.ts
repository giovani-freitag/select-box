export { AbstractAddon } from "./addons/index.js";
export {
    SelectBoxKeyDispatcher,
    type DispatchKeyOutcome,
} from "./controllers/key-dispatcher.js";
export { MultiSelectBoxController } from "./controllers/multi-select-box-controller.js";
export { MultiSelectionDriver } from "./controllers/multi-selection-driver.js";
export { SelectBoxController } from "./controllers/select-box-controller.js";
export { SingleSelectBoxController } from "./controllers/single-select-box-controller.js";
export { SingleSelectionDriver } from "./controllers/single-selection-driver.js";
export { SelectBoxSnapshotView } from "./snapshot-view.js";
export { isMultiSelection, isMultiSelectionInput } from "./selection-value.js";
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
    AddonTransformContext,
    MultiSelectBoxControllerConfig,
    OptionFilterStrategy,
    SearchMatchRange,
    SelectBoxAddon,
    SelectBoxAddonSnapshots,
    SelectBoxControllerCommonConfig,
    SelectBoxControllerConfig,
    SelectBoxSnapshot,
    SelectGroup,
    SelectionDriver,
    SelectionMode,
    SelectionValue,
    SelectionValueInput,
    SelectOption,
    SingleSelectBoxControllerConfig,
} from "./types.js";

export const packageName = "@select-box/core" as const;
