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
                ...(config.addons !== undefined ? { addons: config.addons } : {}),
                ...(config.ariaLabel !== undefined ? { ariaLabel: config.ariaLabel } : {}),
                disabled: config.disabled === true,
                readOnly: config.readOnly === true,
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
            setMulti: (multi) => {
                void wrapper.setProps({ multi });
            },
            setValue: (value) => {
                exposed?.controller.setValue(value);
            },
            reportedChanges: () =>
                [
                    ...(wrapper.emitted("change") ?? []),
                    ...(wrapper.emitted("change-multi") ?? []),
                ].map((payload) => (payload as ReadonlyArray<unknown>)[0]),
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
