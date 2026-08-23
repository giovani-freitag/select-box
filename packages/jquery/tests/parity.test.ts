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
        jQuery(mountPoint).selectBox({
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
                    jQuery(mountPoint).selectBox("options", options);
                },
                setMulti: (multi) => {
                    jQuery(mountPoint).selectBox("setMode", multi ? "multi" : "single");
                },
                setValue: (value) => {
                    jQuery(mountPoint).selectBox("controller")?.commitValue(value);
                },
                reportedChanges: () => reported,
                publicRoot: () => jQuery(mountPoint).selectBox("root") ?? null,
                publicController: () => jQuery(mountPoint).selectBox("controller") ?? null,
                settle: () => Promise.resolve(),
                teardown: () => {
                    jQuery(mountPoint).selectBox("destroy");
                    mountPoint.remove();
                },
            }),
        );
    },
});
