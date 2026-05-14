// #region snippet
import { SelectBox } from "@select-box/react";
import { HoistSelectedAddon } from "@select-box/addon-hoist-selected";

const fruits = [
    { value: "apple", label: "Apple", group: "Pomes" },
    { value: "pear", label: "Pear", group: "Pomes" },
    { value: "quince", label: "Quince", group: "Pomes" },
    { value: "lemon", label: "Lemon", group: "Citrus" },
    { value: "lime", label: "Lime", group: "Citrus" },
    { value: "orange", label: "Orange", group: "Citrus" },
    { value: "blueberry", label: "Blueberry", group: "Berries" },
    { value: "raspberry", label: "Raspberry", group: "Berries" },
    { value: "strawberry", label: "Strawberry", group: "Berries" },
];

// `groupLabel` is the header text shown above the pinned option. Pass any
// already-translated string from your i18n layer; the addon stays
// locale-agnostic. Defaults to "Selected".
const ADDONS = [new HoistSelectedAddon({ groupLabel: "Selected", separator: true })];

export default function Demo(): React.ReactElement {
    return (
        <div className="sb-demo">
            <SelectBox
                options={fruits}
                addons={ADDONS}
                defaultValue="strawberry"
                placeholder="Pick a fruit…"
            />
        </div>
    );
}
// #endregion snippet
