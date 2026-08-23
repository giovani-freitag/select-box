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
        element.options = config.options;
        document.body.append(element);

        return Promise.resolve(
            createDomHandle({
                queryScope: () => element,
                setOptions: (options) => {
                    element.options = options;
                },
                publicRoot: () => element.root,
                publicController: () => element.controller,
                settle: () => Promise.resolve(),
                teardown: () => element.remove(),
            }),
        );
    },
});
