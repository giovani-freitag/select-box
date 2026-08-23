import { beforeAll } from "vitest";

import {
    createDomHandle,
    describeParitySuite,
    type ParityHandle,
    type ParityMountConfig,
} from "@select-box/parity";

import { defineSelectBoxElement } from "../src/index.js";

beforeAll(() => {
    defineSelectBoxElement();
});

describeParitySuite({
    name: "Web Components",

    mount(config: ParityMountConfig): Promise<ParityHandle> {
        const element = document.createElement("select-box");
        element.setAttribute("placeholder", config.placeholder);
        element.setAttribute("surface", config.surface);
        if (config.multi) element.setAttribute("multi", "");
        if (config.disabled === true) element.setAttribute("disabled", "");
        if (config.readOnly === true) element.setAttribute("readonly", "");
        element.options = config.options;
        if (config.addons !== undefined) element.addons = config.addons;
        if (config.ariaLabel !== undefined) element.setAttribute("aria-label", config.ariaLabel);
        const reported: unknown[] = [];
        element.addEventListener("change", () => reported.push(element.value));
        document.body.append(element);

        return Promise.resolve(
            createDomHandle({
                queryScope: () => element,
                setOptions: (options) => {
                    element.options = options;
                },
                setMulti: (multi) => {
                    element.multi = multi;
                },
                setValue: (value) => {
                    element.value = value;
                },
                reportedChanges: () => reported,
                publicRoot: () => element.root,
                publicController: () => element.controller,
                settle: () => Promise.resolve(),
                teardown: () => element.remove(),
            }),
        );
    },
});
