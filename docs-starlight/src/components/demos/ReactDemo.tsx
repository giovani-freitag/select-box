import { useEffect, useState } from "react";
import { SelectBox } from "@select-box/react";
import { FuzzyFilterStrategy } from "@select-box/addon-fuzzy";
import { SubstringFilterStrategy, type OptionFilterStrategy, type SelectOption } from "@select-box/core";

import {
    getFruitsForScenario,
    getUngroupedLabelForScenario,
    type Fruit,
    type FruitExtra,
    type Scenario,
} from "./fruits.js";
import type { SillyOption } from "./silly-generator.js";

interface ReactDemoProps {
    readonly scenario?: Scenario;
}

const SUBSTRING_FILTER = new SubstringFilterStrategy();
const FUZZY_FILTER = new FuzzyFilterStrategy();

export default function ReactDemo({ scenario = "grouped" }: ReactDemoProps): React.ReactElement {
    if (scenario === "large-list") return <LargeListDemo />;
    return <FixedScenarioDemo scenario={scenario} />;
}

function FixedScenarioDemo({ scenario }: { scenario: Exclude<Scenario, "large-list"> }): React.ReactElement {
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
    const ungroupedLabel = getUngroupedLabelForScenario(scenario);

    return (
        <div className="sb-demo-card">
            <label className="sb-demo-label">Pick a fruit</label>
            <SelectBox<FruitExtra>
                options={fruits}
                {...(ungroupedLabel === undefined ? {} : { ungroupedLabel })}
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

function LargeListDemo(): React.ReactElement {
    const [seed, setSeed] = useState<ReadonlyArray<SillyOption>>(() => readSeed());
    const [version, setVersion] = useState(0);
    const [committedLabel, setCommittedLabel] = useState<string | null>(null);

    useEffect(() => {
        function handleBigListChanged(event: Event): void {
            const detail = (event as CustomEvent<{ options: ReadonlyArray<SelectOption> }>).detail;
            setSeed(detail.options as ReadonlyArray<SillyOption>);
            setVersion((current) => current + 1);
            setCommittedLabel(null);
        }
        window.addEventListener("big-list-changed", handleBigListChanged);
        // The page-level controls may have already populated the seed before
        // this island hydrated; sync once at mount in case the event fired earlier.
        const current = readSeed();
        if (current.length > 0) setSeed(current);
        return () => window.removeEventListener("big-list-changed", handleBigListChanged);
    }, []);

    return (
        <div className="sb-demo-card">
            <label className="sb-demo-label">Pick a critter ({seed.length.toLocaleString()})</label>
            <SelectBox
                key={version}
                options={seed}
                placeholder="Search the menagerie…"
                onChange={(_value, option) => setCommittedLabel(option?.label ?? null)}
            />
            <dl className="sb-demo-snapshot">
                <dt>Last committed</dt>
                <dd><code>{committedLabel ?? "null"}</code></dd>
            </dl>
        </div>
    );
}

function readSeed(): ReadonlyArray<SillyOption> {
    if (typeof window === "undefined") return [];
    const seed = window.__bigListSeed;
    return Array.isArray(seed) ? (seed as ReadonlyArray<SillyOption>) : [];
}
