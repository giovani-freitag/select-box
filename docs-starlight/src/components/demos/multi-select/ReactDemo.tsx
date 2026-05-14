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
    const [committed, setCommitted] = useState<ReadonlyArray<string>>([]);
    return (
        <div className="sb-demo multi-demo">
            <SelectBox
                multi
                options={fruits}
                placeholder="Pick fruits…"
                ungroupedLabel="Citrus"
                onChange={setCommitted}
            />
            <output>
                <code>{JSON.stringify(committed)}</code>
            </output>
        </div>
    );
}
// #endregion snippet
