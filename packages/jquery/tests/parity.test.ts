import jQuery from "jquery";

import {
    createDomHandle,
    describeParitySuite,
    type ParityHandle,
    type ParityMountConfig,
} from "@select-box/parity";

import "../src/index.js";

describeParitySuite({
    name: "jQuery",

    mount(config: ParityMountConfig): Promise<ParityHandle> {
        const mountPoint = document.createElement("div");
        document.body.append(mountPoint);

        const reported: unknown[] = [];
        jQuery(mountPoint).on("change", (_event: unknown, value: unknown) => reported.push(value));
        jQuery(mountPoint).on("selectbox:change", (_event: unknown, values: unknown) =>
            reported.push(values),
        );
        const box = jQuery(mountPoint).selectBox({
            options: config.options,
            placeholder: config.placeholder,
            mode: config.multi ? "multi" : "single",
            surface: config.surface,
            ...(config.addons !== undefined ? { addons: config.addons } : {}),
            ...(config.ariaLabel !== undefined ? { ariaLabel: config.ariaLabel } : {}),
            disabled: config.disabled === true,
            readOnly: config.readOnly === true,
        });

        return Promise.resolve(
            createDomHandle({
                queryScope: () => mountPoint,
                setOptions: (options) => {
                    box.setOptions(options);
                },
                setMulti: (multi) => {
                    box.setMode(multi ? "multi" : "single");
                },
                setValue: (value) => {
                    box.controller.commitValue(value);
                },
                reportedChanges: () => reported,
                // Reached through the element rather than the captured handle,
                // so the parity suite exercises the door a consumer has.
                publicRoot: () => mountPoint.selectBox?.root ?? null,
                publicController: () => mountPoint.selectBox?.controller ?? null,
                settle: () => Promise.resolve(),
                teardown: () => {
                    box.destroy();
                    mountPoint.remove();
                },
            }),
        );
    },
});
