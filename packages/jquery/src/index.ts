import type { SelectBoxController, SelectionValue, SelectOption } from "@select-box/core";
import jQuery from "jquery";

import { registerSelectBoxPlugin, type SelectBoxPluginConfig } from "./plugin.js";

export { registerSelectBoxPlugin, type SelectBoxPluginConfig } from "./plugin.js";
export { SelectBoxView } from "./select-box-view.js";

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

export const packageName = "@select-box/jquery" as const;

declare global {
    interface JQuery<TElement = HTMLElement> {
        selectBox<TExtra extends object = object>(
            config: SelectBoxPluginConfig<TExtra>,
        ): JQuery<TElement>;
        selectBox(method: "open" | "close" | "toggle" | "clear" | "destroy"): JQuery<TElement>;
        selectBox(method: "setMode", mode: "single" | "multi"): JQuery<TElement>;
        selectBox<TExtra extends object = object>(
            method: "controller",
        ): SelectBoxController<TExtra, SelectionValue> | undefined;
        selectBox(method: "root"): HTMLElement | undefined;
        selectBox<TExtra extends object = object>(
            method: "options",
            options: ReadonlyArray<SelectOption<TExtra>>,
        ): JQuery<TElement>;
    }
}

registerSelectBoxPlugin(jQuery);
