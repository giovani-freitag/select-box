import type { SelectBoxControllerConfig, SelectOption } from "@select-box/core";
import type JQueryStatic from "jquery";

import { SelectBoxView, type SelectBoxSurface } from "./select-box-view.js";

export type { SelectBoxSurface };

export interface SelectBoxPluginConfig<TExtra extends object = object>
    extends Omit<SelectBoxControllerConfig<TExtra>, "mode"> {
    /**
     * Accumulates a selection instead of replacing it, the way `multiple` does
     * on a native `<select>`. The same flag every other wrapper takes; `mode`
     * stays the core's own, driver-level term.
     */
    readonly multiple?: boolean;
    readonly placeholder?: string;
    /**
     * Text shown when the query matches nothing.
     *
     * Pass it already translated; the plugin stays locale-agnostic, the same way
     * the addons do.
     */
    readonly emptyMessage?: string;
    readonly surface?: SelectBoxSurface;
    /** Field name under which the selection is submitted. Omit to stay out of the form. */
    readonly name?: string;
    /** Blocks submission while nothing is selected, natively. */
    readonly required?: boolean;
    /** Accessible name for the combobox, when no visible label points at it. */
    readonly ariaLabel?: string;
    /** Id of the element that labels the combobox. */
    readonly ariaLabelledby?: string;
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
 * Raised when the plugin is called the old way, with a method name.
 *
 * The methods moved onto the instance the plugin returns. Without this the
 * string would be spread as a config object, quietly tearing down the live
 * widget and mounting an empty one in its place.
 */
export class LegacyMethodCallError extends Error {
    constructor(method: string) {
        super(
            `selectBox("${method}") is no longer supported. Keep the instance the `
            + `plugin returns and call .${method}() on it, or reach it through `
            + `element.selectBox.`,
        );
        this.name = "LegacyMethodCallError";
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
        // Untyped callers reach here with a method name; the types alone cannot
        // stop them, and spreading a string yields an empty config.
        if (typeof config === "string") throw new LegacyMethodCallError(config);
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
        mode: config.multiple === true ? "multi" : "single",
        onValueChange: (value: string | null, option: SelectOption<TExtra> | null) => {
            jq(host).trigger("change", [value, option]);
        },
        // One `change`, whatever the mode: a listener never has to know which
        // event this instance will use. Single passes `(value, option)`, multi
        // passes `(values, options)`.
        onOpenChange: (open: boolean) => {
            jq(host).trigger(open ? "open" : "close");
        },
        onMultiValueChange: (
            values: ReadonlyArray<string>,
            options: ReadonlyArray<SelectOption<TExtra>>,
        ) => {
            jq(host).trigger("change", [values, options]);
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
    host.selectBox = view;
    return view;
}
