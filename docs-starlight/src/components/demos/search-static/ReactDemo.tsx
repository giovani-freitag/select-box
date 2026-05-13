// #region snippet
import { useState } from "react";
import { SelectBox } from "@select-box/react";
import { FuzzyFilterStrategy } from "@select-box/addon-fuzzy";

const FUZZY = new FuzzyFilterStrategy();

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

export default function Demo(): React.ReactElement {
    const [committed, setCommitted] = useState<(typeof fruits)[number] | null>(null);
    return (
        <div className="sb-demo">
            <SelectBox
                options={fruits}
                filter={FUZZY}
                placeholder="Search fruits…"
                onChange={(_value, option) => setCommitted(option)}
            />
            <output><code>{committed ? JSON.stringify(committed) : "null"}</code></output>
        </div>
    );
}
// #endregion snippet
