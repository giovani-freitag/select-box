import "@select-box/jquery";
import "@select-box/styles/select-box.css";
import jQuery from "jquery";

import { readFixtureConfig, wireControls } from "./config.js";
import { reportChange } from "./report.js";

const config = readFixtureConfig();
const host = jQuery("#mount");
let surface = config.surface;

function mount(): void {
    host.selectBox({
        options: config.options,
        placeholder: config.placeholder,
        mode: config.multi ? "multi" : "single",
        surface,
    });
    host.on("change", (_event: unknown, value: unknown) => reportChange(value));
    host.on("selectbox:change", (_event: unknown, values: unknown) => reportChange(values));
}

mount();

wireControls({
    destroy: () => host.selectBox("destroy"),
    toggleSurface: () => {
        surface = surface === "inline" ? "popover" : "inline";
        host.selectBox("destroy");
        mount();
    },
});
