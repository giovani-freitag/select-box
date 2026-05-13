// #region snippet
import { SelectBox } from "@select-box/react";

const fruits = [
    { value: "apple", label: "Apple", group: "In stock" },
    { value: "pear", label: "Pear", group: "In stock" },
    { value: "grape", label: "Grape", group: "In stock", disabled: true },
    { value: "plum", label: "Plum", group: "Out of season", disabled: true },
    { value: "cherry", label: "Cherry", group: "Out of season", disabled: true },
    { value: "lemon", label: "Lemon" },
    { value: "orange", label: "Orange", disabled: true },
];

export default function Demo(): React.ReactElement {
    return (
        <div className="sb-demo">
            <SelectBox
                options={fruits}
                ungroupedLabel="Citrus"
                placeholder="Pick a fruit"
            />
        </div>
    );
}
// #endregion snippet
