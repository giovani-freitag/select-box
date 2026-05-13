import { useEffect, useState } from "react";
import { SelectBox } from "@select-box/react";
import { FuzzyFilterStrategy } from "@select-box/addon-fuzzy";
import { SubstringFilterStrategy, type OptionFilterStrategy } from "@select-box/core";

import { searchableFruits, type Fruit, type FruitExtra } from "./fruits";

const SUBSTRING = new SubstringFilterStrategy<FruitExtra>();
const FUZZY = new FuzzyFilterStrategy<FruitExtra>();

export default function ReactDemo(): React.ReactElement {
    const [committed, setCommitted] = useState<Fruit | null>(null);
    const [filter, setFilter] = useState<OptionFilterStrategy<FruitExtra>>(SUBSTRING);

    useEffect(() => {
        function handleModeChanged(event: Event): void {
            const mode = (event as CustomEvent<{ mode: "substring" | "fuzzy" }>).detail.mode;
            setFilter(mode === "fuzzy" ? FUZZY : SUBSTRING);
        }
        window.addEventListener("filter-mode-changed", handleModeChanged);
        return () => window.removeEventListener("filter-mode-changed", handleModeChanged);
    }, []);

    return (
        <div className="sb-demo-card">
            <label className="sb-demo-label">Pick a fruit</label>
            <SelectBox<FruitExtra>
                options={searchableFruits}
                placeholder="Search fruits…"
                filter={filter}
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
