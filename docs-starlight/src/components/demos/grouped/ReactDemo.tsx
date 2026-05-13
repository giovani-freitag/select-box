// #region snippet
import { useState } from "react";
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
    const [committed, setCommitted] = useState<(typeof fruits)[number] | null>(null);
    return (
        <div className="sb-demo">
            <SelectBox
                options={fruits}
                ungroupedLabel="Citrus"
                placeholder="Pick a fruit"
                onChange={(_value, option) => setCommitted(option)}
            />
            <output><code>{committed ? JSON.stringify(committed) : "null"}</code></output>
        </div>
    );
}
// #endregion snippet
