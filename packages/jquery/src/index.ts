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
    type SingleSelectBoxConfig,
} from "@select-box/core";

export const packageName = "@select-box/jquery" as const;

declare global {
    interface JQuery<TElement = HTMLElement> {
        selectBox<TValue>(config: SelectBoxPluginConfig<TValue>): JQuery<TElement>;
        selectBox(method: "open" | "close" | "toggle" | "clear" | "destroy"): JQuery<TElement>;
        selectBox<TValue>(method: "controller"): SingleSelectBoxController<TValue> | undefined;
    }
}

registerSelectBoxPlugin(jQuery);
