// #region snippet
import { useState } from "react";
import { SelectBox } from "@select-box/react";
import { FuzzyFilterStrategy } from "@select-box/addon-fuzzy";
import { SubstringFilterStrategy, type OptionFilterStrategy } from "@select-box/core";

const SUBSTRING = new SubstringFilterStrategy();
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
    const [filter, setFilter] = useState<OptionFilterStrategy>(SUBSTRING);
    return (
        <div className="sb-demo">
            <label>
                <input
                    type="checkbox"
                    onChange={(event) => setFilter(event.target.checked ? FUZZY : SUBSTRING)}
                />
                Use fuzzy search
            </label>
            <SelectBox
                options={fruits}
                filter={filter}
                placeholder="Search fruits…"
                onChange={(_value, option) => setCommitted(option)}
            />
            <output><code>{committed ? JSON.stringify(committed) : "null"}</code></output>
        </div>
    );
}
// #endregion snippet
