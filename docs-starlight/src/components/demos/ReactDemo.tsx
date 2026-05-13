import { useEffect, useState } from "react";
import { SelectBox } from "@select-box/react";
import { FuzzyFilterStrategy } from "@select-box/addon-fuzzy";
import { SubstringFilterStrategy, type OptionFilterStrategy } from "@select-box/core";

import { getFruitsForScenario, type Fruit, type FruitExtra, type Scenario } from "./fruits.js";

interface ReactDemoProps {
    readonly scenario?: Scenario;
}

const SUBSTRING_FILTER = new SubstringFilterStrategy<FruitExtra>();
const FUZZY_FILTER = new FuzzyFilterStrategy<FruitExtra>();

export default function ReactDemo({ scenario = "grouped" }: ReactDemoProps): React.ReactElement {
    const [committedOption, setCommittedOption] = useState<Fruit | null>(null);
    const [filterStrategy, setFilterStrategy] = useState<OptionFilterStrategy<FruitExtra>>(
        SUBSTRING_FILTER,
    );

    useEffect(() => {
        if (scenario !== "search") return;
        function handleFilterModeChanged(event: Event): void {
            const mode = (event as CustomEvent<{ mode: "substring" | "fuzzy" }>).detail.mode;
            setFilterStrategy(mode === "fuzzy" ? FUZZY_FILTER : SUBSTRING_FILTER);
        }
        window.addEventListener("filter-mode-changed", handleFilterModeChanged);
        return () => window.removeEventListener("filter-mode-changed", handleFilterModeChanged);
    }, [scenario]);

    const fruits = getFruitsForScenario(scenario);

    return (
        <div className="sb-demo-card">
            <label className="sb-demo-label">Pick a fruit</label>
            <SelectBox<FruitExtra>
                options={fruits}
                ungroupedLabel="Citrus"
                placeholder="Search fruits…"
                filter={filterStrategy}
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
