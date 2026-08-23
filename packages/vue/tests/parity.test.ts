import { mount } from "@vue/test-utils";
import { nextTick } from "vue";

import {
    createDomHandle,
    describeParitySuite,
    type ParityController,
    type ParityHandle,
    type ParityMountConfig,
} from "@select-box/parity";

import { SelectBox } from "../src/index.js";

describeParitySuite({
    name: "Vue",

    async mount(config: ParityMountConfig): Promise<ParityHandle> {
        const mountPoint = document.createElement("div");
        document.body.append(mountPoint);
        const wrapper = mount(SelectBox, {
            props: {
                options: config.options,
                placeholder: config.placeholder,
                multi: config.multi,
                surface: config.surface,
            },
            attachTo: mountPoint,
        });
        await nextTick();
        const exposed = (
            wrapper.vm.$ as unknown as {
                exposed: { root: HTMLElement | null; controller: ParityController } | null;
            }
        ).exposed;

        return createDomHandle({
            queryScope: () => mountPoint,
            setOptions: (options) => {
                void wrapper.setProps({ options });
            },
            publicRoot: () => exposed?.root ?? null,
            publicController: () => exposed?.controller ?? null,
            settle: () => nextTick(),
            teardown: () => {
                wrapper.unmount();
                mountPoint.remove();
            },
        });
    },
});
