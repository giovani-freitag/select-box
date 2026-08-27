import {
    createDomHandle,
    describeParitySuite,
    type ParityHandle,
    type ParityMountConfig,
} from "@select-box/parity";

import { defineSelectBoxElement, type SelectBox } from "../src/index.js";

defineSelectBoxElement("select-box-lit-parity");

describeParitySuite({
    name: "Lit",

    async mount(config: ParityMountConfig): Promise<ParityHandle> {
        const element = document.createElement("select-box-lit-parity") as SelectBox;
        element.setAttribute("placeholder", config.placeholder);
        element.options = config.options;
        element.surface = config.surface;
        if (config.addons !== undefined) element.addons = config.addons;
        if (config.ariaLabel !== undefined) element.setAttribute("aria-label", config.ariaLabel);
        if (config.emptyMessage !== undefined) element.setAttribute("empty-message", config.emptyMessage);
        if (config.multiple) element.multiple = true;
        if (config.disabled === true) element.disabled = true;
        if (config.readOnly === true) element.readOnly = true;
        const reported: unknown[] = [];
        element.addEventListener("change", () => reported.push(element.value));
        document.body.append(element);
        await element.updateComplete;

        return createDomHandle({
            queryScope: () => element,
            setOptions: (options) => {
                element.options = options;
            },
            setMulti: (multi) => {
                element.multiple = multi;
            },
            setValue: (value) => {
                element.value = value;
            },
            reportedChanges: () => reported,
            publicRoot: () => element.root,
            publicController: () => element.controller,
            settle: async () => {
                await element.updateComplete;
            },
            teardown: () => element.remove(),
        });
    },
});
