import type { SelectBoxView } from "@select-box/jquery";
import "@select-box/jquery";
import "@select-box/styles/select-box.css";
import jQuery from "jquery";

import { readFixtureConfig, wireControls } from "./config.js";
import { reportChange } from "./report.js";

const config = readFixtureConfig();
const host = jQuery("#mount");
let surface = config.surface;

function mount(): SelectBoxView {
    const view = host.selectBox({
        options: config.options,
        placeholder: config.placeholder,
        multiple: config.multiple,
        surface,
        name: config.name,
        required: config.required,
        defaultValue: config.defaultValue,
        // `exactOptionalPropertyTypes` draws the line between "absent" and
        // "present but undefined", so an unset scenario omits the key.
        ...(config.ariaLabel !== undefined ? { ariaLabel: config.ariaLabel } : {}),
    });
    host.on("change", (_event: unknown, value: unknown) => reportChange(value));
    return view;
}

let box = mount();

wireControls({
    destroy: () => box.destroy(),
    toggleSurface: () => {
        surface = surface === "inline" ? "popover" : "inline";
        box.destroy();
        box = mount();
    },
});
