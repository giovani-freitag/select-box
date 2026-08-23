import { beforeAll } from "vitest";

import {
    createDomHandle,
    describeParitySuite,
    type ParityHandle,
    type ParityMountConfig,
} from "@select-box/parity";

import { defineSelectBoxElement, type SelectBox } from "../src/index.js";

// jsdom 25 ships partial ElementInternals — patch the form-association
// methods our component touches.
beforeAll(() => {
    const proto = HTMLElement.prototype as HTMLElement & {
        attachInternals: () => ElementInternals;
    };
    const original = proto.attachInternals;
    proto.attachInternals = function () {
        const internals = original.call(this) as ElementInternals & Record<string, unknown>;
        if (typeof internals.setFormValue !== "function") {
            internals.setFormValue = () => {};
        }
        if (typeof internals.setValidity !== "function") {
            internals.setValidity = () => {};
        }
        return internals;
    };
});

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
