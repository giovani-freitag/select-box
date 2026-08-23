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
        if (config.multi) element.multi = true;
        document.body.append(element);
        await element.updateComplete;

        return createDomHandle({
            queryScope: () => element,
            publicRoot: () => element.root,
            publicController: () => element.controller,
            settle: async () => {
                await element.updateComplete;
            },
            teardown: () => element.remove(),
        });
    },
});
