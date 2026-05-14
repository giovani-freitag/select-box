// #region snippet
import { useState } from "react";
import { SelectBox } from "@select-box/react";

const fruits = [
    { value: "apple", label: "Apple" },
    { value: "pear", label: "Pear" },
    { value: "peach", label: "Peach" },
    { value: "plum", label: "Plum" },
    { value: "lemon", label: "Lemon" },
];

export default function Demo(): React.ReactElement {
    const [committed, setCommitted] = useState<ReadonlyArray<string>>([]);
    return (
        <div className="sb-demo">
            <SelectBox
                multi
                surface="inline"
                options={fruits}
                onChange={setCommitted}
            />
            <output>
                <code>{JSON.stringify(committed)}</code>
            </output>
        </div>
    );
}
// #endregion snippet
