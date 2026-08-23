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
        });

        return Promise.resolve(
            createDomHandle({
                queryScope: () => mountPoint,
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
