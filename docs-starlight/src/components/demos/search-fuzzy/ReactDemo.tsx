// #region snippet
import { SelectBox } from "@select-box/react";
import { FuzzyAddon } from "@select-box/addon-fuzzy";

const fruits = [
    { value: "apple", label: "Apple" },
    { value: "pear", label: "Pear" },
    { value: "peach", label: "Peach" },
    { value: "lemon", label: "Lemon" },
    { value: "blueberry", label: "Blueberry" },
    { value: "raspberry", label: "Raspberry" },
    { value: "strawberry", label: "Strawberry" },
    { value: "watermelon", label: "Watermelon" },
];

const ADDONS = [new FuzzyAddon()];

export default function Demo(): React.ReactElement {
    return (
        <div className="sb-demo">
            <SelectBox options={fruits} addons={ADDONS} placeholder="Search fruits…" />
        </div>
    );
}
// #endregion snippet
