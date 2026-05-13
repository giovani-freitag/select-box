import { useState } from "react";
import { SelectBox } from "@select-box/react";

import { disabledFruits, type Fruit, type FruitExtra } from "./fruits";

export default function ReactDemo(): React.ReactElement {
    const [committed, setCommitted] = useState<Fruit | null>(null);
    return (
        <div className="sb-demo-card">
            <label className="sb-demo-label">Pick a fruit</label>
            <SelectBox<FruitExtra>
                options={disabledFruits}
                ungroupedLabel="Citrus"
                placeholder="Search fruits…"
                onChange={(_value, option) => setCommitted(option)}
            />
            <dl className="sb-demo-snapshot">
                <dt>Last committed value</dt>
                <dd>
                    <code>{committed ? JSON.stringify(committed) : "null"}</code>
                </dd>
            </dl>
        </div>
    );
}
