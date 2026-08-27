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
        // One listener, because there is one event now, whatever the mode.
        jQuery(mountPoint).on("change", (_event: unknown, value: unknown) => reported.push(value));
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
                    box.setValue(value);
                },
                reportedChanges: () => reported,
                // Root comes through the element door and the controller through
                // the returned instance, so the suite exercises both.
                publicRoot: () => mountPoint.selectBox?.root ?? null,
                publicController: () => box.controller,
                settle: () => Promise.resolve(),
                teardown: () => {
                    box.destroy();
                    mountPoint.remove();
                },
            }),
        );
    },
});
