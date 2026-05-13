import { useEffect, useState } from "react";
import { SelectBox } from "@select-box/react";
import type { SelectOption } from "@select-box/core";

import type { SillyOption } from "./silly-generator";

export default function ReactDemo(): React.ReactElement {
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
