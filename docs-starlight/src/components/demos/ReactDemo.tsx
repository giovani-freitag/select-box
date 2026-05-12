import { useState } from "react";
import { SelectBox } from "@select-box/react";

import { fruits, type Fruit, type FruitExtra } from "./fruits.js";

export default function ReactDemo(): React.ReactElement {
    const [committedOption, setCommittedOption] = useState<Fruit | null>(null);

    return (
        <div className="sb-demo-card">
            <label className="sb-demo-label">Pick a fruit</label>
            <SelectBox<FruitExtra>
                options={fruits}
                ungroupedLabel="Citrus"
                placeholder="Search fruits…"
                onChange={(_value, option) => setCommittedOption(option)}
            />
            <dl className="sb-demo-snapshot">
                <dt>Last committed value</dt>
                <dd>
                    <code>{committedOption ? JSON.stringify(committedOption) : "null"}</code>
                </dd>
            </dl>
        </div>
    );
}
