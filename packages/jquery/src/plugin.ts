import type {
    SelectBoxController,
    SelectBoxControllerConfig,
    SelectionValue,
    SelectOption,
} from "@select-box/core";
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

/** Extra argument a method may carry: a mode for `setMode`, a list for `options`. */
type MethodArgument<TExtra extends object> =
    | "single"
    | "multi"
    | ReadonlyArray<SelectOption<TExtra>>;

type Method =
    | "open"
    | "close"
    | "toggle"
    | "clear"
    | "destroy"
    | "controller"
    | "root"
    | "options"
    | "setMode";

const VIEWS = new WeakMap<HTMLElement, SelectBoxView>();

/**
 * Registers `$.fn.selectBox` on the supplied jQuery instance; idempotent.
 */
export function registerSelectBoxPlugin(jq: typeof JQueryStatic): void {
    if (typeof (jq.fn as { selectBox?: unknown }).selectBox === "function") return;

    function selectBoxPlugin<TExtra extends object = object>(
        this: JQuery,
        configOrMethod: SelectBoxPluginConfig<TExtra> | Method,
        arg?: MethodArgument<TExtra>,
    ): JQuery | SelectBoxController<TExtra, SelectionValue> | HTMLElement | undefined {
        if (typeof configOrMethod === "string") {
            return invokeMethod<TExtra>(this, configOrMethod, arg);
        }
        return initialize<TExtra>(this, configOrMethod, jq);
    }

    (jq.fn as unknown as { selectBox: typeof selectBoxPlugin }).selectBox = selectBoxPlugin;
}

function initialize<TExtra extends object>(
    collection: JQuery,
    config: SelectBoxPluginConfig<TExtra>,
    jq: typeof JQueryStatic,
): JQuery {
    collection.each((_index, host) => {
        destroyExistingView(host);
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
        });
        host.replaceChildren(view.root);
        VIEWS.set(host, view as unknown as SelectBoxView);
    });
    return collection;
}

function invokeMethod<TExtra extends object>(
    collection: JQuery,
    method: Method,
    arg?: MethodArgument<TExtra>,
): JQuery | SelectBoxController<TExtra, SelectionValue> | HTMLElement | undefined {
    if (method === "controller" || method === "root") {
        const first = collection.get(0);
        if (!first) return undefined;
        const view = VIEWS.get(first) as SelectBoxView<TExtra> | undefined;
        return method === "root" ? view?.root : view?.getController();
    }

    collection.each((_index, host) => {
        const view = VIEWS.get(host);
        if (!view) return;
        switch (method) {
            case "open":
                view.open();
                break;
            case "close":
                view.close();
                break;
            case "toggle":
                view.toggle();
                break;
            case "clear":
                view.clear();
                break;
            case "setMode":
                if (arg === "single" || arg === "multi") view.setMode(arg);
                break;
            case "options":
                if (Array.isArray(arg)) view.setOptions(arg);
                break;
            case "destroy":
                view.destroy();
                VIEWS.delete(host);
                break;
        }
    });
    return collection;
}

function destroyExistingView(host: HTMLElement): void {
    const existing = VIEWS.get(host);
    if (!existing) return;
    existing.destroy();
    VIEWS.delete(host);
}
