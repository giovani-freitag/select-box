import type { SingleSelectBoxController } from "@select-box/core";
import jQuery from "jquery";

import { registerSelectBoxPlugin, type SelectBoxPluginConfig } from "./plugin.js";

export { registerSelectBoxPlugin, type SelectBoxPluginConfig } from "./plugin.js";
export { SelectBoxView } from "./select-box-view.js";

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
    type SingleSelectBoxControllerConfig,
} from "@select-box/core";

export const packageName = "@select-box/jquery" as const;

declare global {
    interface JQuery<TElement = HTMLElement> {
        selectBox<TExtra extends object = object>(
            config: SelectBoxPluginConfig<TExtra>,
        ): JQuery<TElement>;
        selectBox(method: "open" | "close" | "toggle" | "clear" | "destroy"): JQuery<TElement>;
        selectBox<TExtra extends object = object>(
            method: "controller",
        ): SingleSelectBoxController<TExtra> | undefined;
    }
}

registerSelectBoxPlugin(jQuery);
