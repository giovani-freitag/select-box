import jQuery from "jquery";

import { registerSelectBoxPlugin, type SelectBoxPluginConfig } from "./plugin.js";
import type { SelectBoxElementHandle, SelectBoxView } from "./select-box-view.js";

export {
    EmptySelectionError,
    LegacyMethodCallError,
    registerSelectBoxPlugin,
    type SelectBoxPluginConfig,
} from "./plugin.js";
export { SelectBoxView, type SelectBoxElementHandle } from "./select-box-view.js";

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
    type SelectionValueInput,
    type SelectOption,
    type SingleSelectBoxControllerConfig,
} from "@select-box/core";

export const packageName = "@select-box/jquery" as const;

declare global {
    interface JQuery {
        /**
         * Builds a select box over every element in the collection.
         *
         * @param config - Options, mode, surface and form wiring.
         * @returns The view built over the first element; the rest are reached
         * through their own `element.selectBox`.
         * @throws EmptySelectionError when the collection is empty.
         */
        selectBox<TExtra extends object = object>(
            config: SelectBoxPluginConfig<TExtra>,
        ): SelectBoxView<TExtra>;
    }

    interface HTMLElement {
        /**
         * The select box mounted on this element, if any.
         *
         * Reachable as `$(el).prop("selectBox")` or `$(el)[0].selectBox`, and
         * cleared the moment the view is destroyed. Narrowed to the members a
         * global property can type: cast to `SelectBoxView<TExtra>` to reach the
         * controller or replace the options.
         */
        selectBox?: SelectBoxElementHandle;
    }
}

registerSelectBoxPlugin(jQuery);
