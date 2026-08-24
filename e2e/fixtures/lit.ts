import { defineSelectBoxElement, type SelectBox } from "@select-box/lit";
import "@select-box/styles/select-box.css";

import { readFixtureConfig, wireControls } from "./config.js";
import { reportChange } from "./report.js";

defineSelectBoxElement("select-box-lit");

const config = readFixtureConfig();
const element = document.createElement("select-box-lit") as SelectBox;
element.setAttribute("placeholder", config.placeholder);
if (config.name !== "") element.setAttribute("name", config.name);
if (config.required) element.setAttribute("required", "");
element.options = config.options;
element.surface = config.surface;
if (config.multi) element.multi = true;
if (config.initialValue !== undefined) element.value = config.initialValue;
element.addEventListener("change", () => reportChange(element.value));
document.querySelector("#mount")!.append(element);

wireControls({
    destroy: () => element.remove(),
    toggleSurface: () => {
        element.surface = element.surface === "inline" ? "popover" : "inline";
    },
});
