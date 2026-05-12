import { useState } from "react";
import { SelectBox } from "@select-box/react";

import { fruits, type Fruit } from "./fruits.js";

export default function ReactDemo(): React.ReactElement {
    const [committedValue, setCommittedValue] = useState<Fruit | null>(null);

    return (
        <div className="sb-demo-card">
            <label className="sb-demo-label">Pick a fruit</label>
            <SelectBox<Fruit>
                options={fruits}
                ungroupedLabel="Citrus"
                placeholder="Search fruits…"
                onChange={setCommittedValue}
            />
            <dl className="sb-demo-snapshot">
                <dt>Last committed value</dt>
                <dd>
                    <code>{committedValue ? JSON.stringify(committedValue) : "null"}</code>
                </dd>
            </dl>
        </div>
    );
}
