import type { SelectBoxControllerConfig, SelectOption } from "@select-box/core";
import type JQueryStatic from "jquery";

import { SelectBoxView, type SelectBoxSurface } from "./select-box-view.js";

export type { SelectBoxSurface };

export interface SelectBoxPluginConfig<TExtra extends object = object>
    extends SelectBoxControllerConfig<TExtra> {
    readonly placeholder?: string;
    readonly surface?: SelectBoxSurface;
    /** Field name under which the selection is submitted. Omit to stay out of the form. */
    readonly name?: string;
    /** Blocks submission while nothing is selected, natively. */
    readonly required?: boolean;
}

/**
 * Raised when the plugin is asked to build a select box over nothing.
 *
 * The plugin hands back the instance it built, so an empty collection has no
 * honest return value — and it almost always means the selector was wrong.
 */
export class EmptySelectionError extends Error {
    constructor() {
        super("selectBox() was called on an empty jQuery collection.");
        this.name = "EmptySelectionError";
    }
}

/**
 * Registers `$.fn.selectBox` on the supplied jQuery instance; idempotent.
 *
 * @param jq - The jQuery instance to extend.
 */
export function registerSelectBoxPlugin(jq: typeof JQueryStatic): void {
    if (typeof (jq.fn as { selectBox?: unknown }).selectBox === "function") return;

    function selectBoxPlugin<TExtra extends object = object>(
        this: JQuery,
        config: SelectBoxPluginConfig<TExtra>,
    ): SelectBoxView<TExtra> {
        const views = this.get().map((host) => mount<TExtra>(host, config, jq));
        const first = views[0];
        if (first === undefined) throw new EmptySelectionError();
        return first;
    }

    (jq.fn as unknown as { selectBox: typeof selectBoxPlugin }).selectBox = selectBoxPlugin;
}

function mount<TExtra extends object>(
    host: HTMLElement,
    config: SelectBoxPluginConfig<TExtra>,
    jq: typeof JQueryStatic,
): SelectBoxView<TExtra> {
    host.selectBox?.destroy();
    const view = new SelectBoxView<TExtra>({
        ...config,
        onValueChange: (value: string | null, option: SelectOption<TExtra> | null) => {
            jq(host).trigger("change", [value, option]);
        },
        onMultiValueChange: (
            values: ReadonlyArray<string>,
            options: ReadonlyArray<SelectOption<TExtra>>,
        ) => {
            jq(host).trigger("selectbox:change", [values, options]);
        },
        // Whoever tore the view down, the element must stop advertising it —
        // including a `view.destroy()` the plugin never saw. Safe to delete
        // unconditionally only because the old view is destroyed below before
        // the new one is advertised, never after.
        onDestroy: () => {
            delete host.selectBox;
        },
    });
    host.replaceChildren(view.root);
    // The element is the handle, the way Selectize hangs its instance off the
    // input: `$(el).prop("selectBox")` reaches it without keeping a variable.
    host.selectBox = view as unknown as SelectBoxView;
    return view;
}
