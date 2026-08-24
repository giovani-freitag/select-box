import "@select-box/styles/select-box.css";
import { defineSelectBoxElement } from "@select-box/webcomponents";

import { readFixtureConfig, wireControls } from "./config.js";
import { reportChange } from "./report.js";

defineSelectBoxElement();

const config = readFixtureConfig();
const element = document.createElement("select-box");
element.setAttribute("placeholder", config.placeholder);
if (config.name !== "") element.setAttribute("name", config.name);
if (config.required) element.setAttribute("required", "");
element.setAttribute("surface", config.surface);
if (config.multi) element.setAttribute("multi", "");
element.options = config.options;
if (config.initialValue !== undefined) element.value = config.initialValue;
element.addEventListener("change", () => reportChange(element.value));
document.querySelector("#mount")!.append(element);

wireControls({
    destroy: () => element.remove(),
    toggleSurface: () => {
        element.setAttribute(
            "surface",
            element.getAttribute("surface") === "inline" ? "popover" : "inline",
        );
    },
});
