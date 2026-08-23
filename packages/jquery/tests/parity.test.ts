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

        jQuery(mountPoint).selectBox({
            options: config.options,
            placeholder: config.placeholder,
            mode: config.multi ? "multi" : "single",
            surface: config.surface,
            disabled: config.disabled === true,
            readOnly: config.readOnly === true,
        });

        return Promise.resolve(
            createDomHandle({
                queryScope: () => mountPoint,
                setOptions: (options) => {
                    jQuery(mountPoint).selectBox("options", options);
                },
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
