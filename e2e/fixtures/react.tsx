import { SelectBox, type SelectBoxSurface } from "@select-box/react";
import "@select-box/styles/select-box.css";
import { useState } from "react";
import { createRoot } from "react-dom/client";

import { readFixtureConfig, wireControls } from "./config.js";
import { reportChange } from "./report.js";

const config = readFixtureConfig();

// The prop is mode-shaped, so the scenario's raw value is narrowed per branch
// rather than cast.
const defaultMulti = Array.isArray(config.initialValue) ? config.initialValue : [];
const defaultSingle = typeof config.initialValue === "string" ? config.initialValue : null;

function Fixture(): React.JSX.Element {
    const [surface, setSurface] = useState<SelectBoxSurface>(config.surface);
    (window as unknown as { toggleSurface: () => void }).toggleSurface = () => {
        setSurface((current: SelectBoxSurface) => (current === "inline" ? "popover" : "inline"));
    };

    if (config.multi) {
        return (
            <SelectBox
                multi
                options={config.options}
                placeholder={config.placeholder}
                surface={surface}
                name={config.name}
                required={config.required}
                defaultValue={defaultMulti}
                onChange={(values) => reportChange(values)}
            />
        );
    }
    return (
        <SelectBox
            options={config.options}
            placeholder={config.placeholder}
            surface={surface}
            name={config.name}
            required={config.required}
            defaultValue={defaultSingle}
            onChange={(value) => reportChange(value)}
        />
    );
}

const root = createRoot(document.querySelector("#mount")!);
root.render(<Fixture />);

wireControls({
    destroy: () => root.unmount(),
    toggleSurface: () => (window as unknown as { toggleSurface: () => void }).toggleSurface(),
});
