import type { SingleSelectBoxConfig, SingleSelectBoxController } from "@select-box/core";
import type JQueryStatic from "jquery";

import { SelectBoxView } from "./select-box-view.js";

export interface SelectBoxPluginConfig<TValue> extends SingleSelectBoxConfig<TValue> {
    readonly placeholder?: string;
}

type Method = "open" | "close" | "toggle" | "clear" | "destroy" | "controller";

const VIEWS = new WeakMap<HTMLElement, SelectBoxView<unknown>>();

/**
 * Registers `$.fn.selectBox` on the supplied jQuery instance; idempotent.
 */
export function registerSelectBoxPlugin(jq: typeof JQueryStatic): void {
    if (typeof (jq.fn as { selectBox?: unknown }).selectBox === "function") return;

    function selectBoxPlugin<TValue>(
        this: JQuery,
        configOrMethod: SelectBoxPluginConfig<TValue> | Method,
    ): JQuery | SingleSelectBoxController<TValue> | undefined {
        if (typeof configOrMethod === "string") {
            return invokeMethod<TValue>(this, configOrMethod, jq);
        }
        return initialize<TValue>(this, configOrMethod, jq);
    }

    (jq.fn as unknown as { selectBox: typeof selectBoxPlugin }).selectBox = selectBoxPlugin;
}

function initialize<TValue>(
    collection: JQuery,
    config: SelectBoxPluginConfig<TValue>,
    jq: typeof JQueryStatic,
): JQuery {
    collection.each((_index, host) => {
        destroyExistingView(host);
        const view = new SelectBoxView<TValue>({
            ...config,
            onValueChange: (value) => {
                jq(host).trigger("change", [value]);
            },
        });
        host.replaceChildren(view.root);
        VIEWS.set(host, view as SelectBoxView<unknown>);
    });
    return collection;
}

function invokeMethod<TValue>(
    collection: JQuery,
    method: Method,
    _jq: typeof JQueryStatic,
): JQuery | SingleSelectBoxController<TValue> | undefined {
    if (method === "controller") {
        const first = collection.get(0);
        if (!first) return undefined;
        const view = VIEWS.get(first) as SelectBoxView<TValue> | undefined;
        return view?.getController();
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
