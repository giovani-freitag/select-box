// #region snippet
import { SelectBox } from "@select-box/react";

const fruits = [
    { value: "apple", label: "Apple", group: "Pomes" },
    { value: "pear", label: "Pear", group: "Pomes" },
    { value: "peach", label: "Peach", group: "Stone fruits" },
    { value: "plum", label: "Plum", group: "Stone fruits" },
    { value: "lemon", label: "Lemon" },
    { value: "orange", label: "Orange" },
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
