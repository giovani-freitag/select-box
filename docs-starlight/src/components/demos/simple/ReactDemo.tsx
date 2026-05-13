// #region snippet
import { useState } from "react";
import { SelectBox } from "@select-box/react";

const fruits = [
    { value: "apple", label: "Apple" },
    { value: "pear", label: "Pear" },
    { value: "grape", label: "Grape" },
    { value: "lemon", label: "Lemon" },
    { value: "peach", label: "Peach" },
];

export default function Demo(): React.ReactElement {
    const [committed, setCommitted] = useState<(typeof fruits)[number] | null>(null);
    return (
        <div className="sb-demo">
            <SelectBox
                options={fruits}
                placeholder="Pick a fruit"
                onChange={(_value, option) => setCommitted(option)}
            />
            <output><code>{committed ? JSON.stringify(committed) : "null"}</code></output>
        </div>
    );
}
// #endregion snippet
