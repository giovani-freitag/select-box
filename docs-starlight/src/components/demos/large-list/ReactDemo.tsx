// #region snippet
import { useMemo, useState } from "react";
import { SelectBox } from "@select-box/react";

function generate(count: number): ReadonlyArray<{ value: string; label: string }> {
    return Array.from({ length: count }, (_, index) => ({
        value: String(index),
        label: `Item ${index + 1}`,
    }));
}

export default function Demo(): React.ReactElement {
    const [count, setCount] = useState(1000);
    const options = useMemo(() => generate(count), [count]);
    return (
        <div className="sb-demo">
            <label>
                Items: <strong>{count.toLocaleString()}</strong>
                <input
                    type="range"
                    min="100"
                    max="100000"
                    step="100"
                    value={count}
                    onChange={(event) => setCount(Number(event.target.value))}
                />
            </label>
            <SelectBox key={count} options={options} placeholder="Search…" />
        </div>
    );
}
// #endregion snippet
