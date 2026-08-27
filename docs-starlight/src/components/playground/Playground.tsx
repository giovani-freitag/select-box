import { useMemo, useState, type JSX, type ReactElement } from "react";
import { SelectBox } from "@select-box/react";
import { ClearButtonAddon } from "@select-box/addon-clear-button";
import { HoistSelectedAddon } from "@select-box/addon-hoist-selected";
import { FuzzyAddon } from "@select-box/addon-fuzzy";
import type { SelectBoxAddon } from "@select-box/core";

import { buildSnippet } from "./build-snippet.js";
import { DEFAULT_CONFIG, optionsFor, type AddonKey, type PlaygroundConfig } from "./fixtures.js";

const SURFACES = [
    { value: "popover", label: "Popover — opens over the page" },
    { value: "inline", label: "Inline — every option on screen" },
];

const CARDINALITIES = [
    { value: "single", label: "Single — one pick, closes on commit" },
    { value: "multi", label: "Multi — toggles, stays open" },
];

const SHAPES = [
    { value: "grouped", label: "Grouped under headers" },
    { value: "flat", label: "Flat list" },
];

const ROW_STATES = [
    { value: "all", label: "Every row selectable" },
    { value: "some-disabled", label: "Two rows disabled" },
];

const INTERACTIVITY = [
    { value: "enabled", label: "Enabled" },
    { value: "disabled", label: "Disabled — refuses everything" },
    { value: "readOnly", label: "Read-only — submits, refuses edits" },
];

const ADDONS = [
    { value: "clear-button", label: "Clear button" },
    { value: "hoist-selected", label: "Hoist selected to the top" },
    { value: "fuzzy", label: "Fuzzy search" },
];

function buildAddons(keys: ReadonlyArray<AddonKey>): ReadonlyArray<SelectBoxAddon<object>> {
    return keys.map((key) => {
        if (key === "clear-button") return new ClearButtonAddon({});
        if (key === "hoist-selected") return new HoistSelectedAddon({});
        return new FuzzyAddon({});
    });
}

interface KnobProps {
    readonly label: string;
    readonly options: ReadonlyArray<{ value: string; label: string }>;
    readonly value: string;
    readonly onPick: (value: string) => void;
}

function Knob({ label, options, value, onPick }: KnobProps): ReactElement {
    return (
        <div className="sb-knob">
            <span className="sb-knob-label" aria-hidden="true">
                {label}
            </span>
            <SelectBox
                options={options}
                defaultValue={value}
                aria-label={label}
                onChange={(next) => {
                    if (next !== null) onPick(next);
                }}
            />
        </div>
    );
}

function describeSelection(value: string | null | ReadonlyArray<string>): string {
    if (value === null) return "null";
    if (Array.isArray(value)) return value.length === 0 ? "[]" : JSON.stringify(value);

    return JSON.stringify(value);
}

export default function Playground(): JSX.Element {
    const [config, setConfig] = useState<PlaygroundConfig>(DEFAULT_CONFIG);
    const [committed, setCommitted] = useState<string | null | ReadonlyArray<string>>(null);

    const options = useMemo(() => optionsFor(config), [config]);
    const addons = useMemo(() => buildAddons(config.addons), [config.addons]);
    // Addons are read once, when the controller is built, so the preview has to
    // be rebuilt when the set changes. Every other knob is live.
    const addonKey = config.addons.join("|");

    const update = <TKey extends keyof PlaygroundConfig>(
        key: TKey,
        value: PlaygroundConfig[TKey],
    ): void => {
        setConfig((current) => ({ ...current, [key]: value }));
        setCommitted(null);
    };

    const shared = {
        key: addonKey,
        options,
        addons,
        surface: config.surface,
        disabled: config.interactivity === "disabled",
        readOnly: config.interactivity === "readOnly",
        ...(config.shape === "grouped" ? { ungroupedLabel: "Citrus" } : {}),
        ...(config.surface === "popover" ? { placeholder: "Pick a fruit" } : {}),
        "aria-label": "Configured select box",
    } as const;

    return (
        <div className="sb-playground not-content">
            <div className="sb-playground-knobs">
                <Knob
                    label="Surface"
                    options={SURFACES}
                    value={config.surface}
                    onPick={(next) => update("surface", next as PlaygroundConfig["surface"])}
                />
                <Knob
                    label="Selection"
                    options={CARDINALITIES}
                    value={config.multi ? "multi" : "single"}
                    onPick={(next) => update("multi", next === "multi")}
                />
                <Knob
                    label="Options"
                    options={SHAPES}
                    value={config.shape}
                    onPick={(next) => update("shape", next as PlaygroundConfig["shape"])}
                />
                <Knob
                    label="Rows"
                    options={ROW_STATES}
                    value={config.withDisabled ? "some-disabled" : "all"}
                    onPick={(next) => update("withDisabled", next === "some-disabled")}
                />
                <Knob
                    label="State"
                    options={INTERACTIVITY}
                    value={config.interactivity}
                    onPick={(next) =>
                        update("interactivity", next as PlaygroundConfig["interactivity"])
                    }
                />
                <div className="sb-knob">
                    <span className="sb-knob-label" aria-hidden="true">
                        Addons
                    </span>
                    <SelectBox
                        multi
                        options={ADDONS}
                        defaultValue={[]}
                        aria-label="Addons"
                        placeholder="None"
                        onChange={(values) => update("addons", values as ReadonlyArray<AddonKey>)}
                    />
                </div>
            </div>

            <div className="sb-playground-stage">
                <span className="sb-playground-caption">Live preview</span>
                {config.multi ? (
                    <SelectBox
                        {...shared}
                        multi
                        onChange={(values) => setCommitted(values)}
                    />
                ) : (
                    <SelectBox {...shared} onChange={(value) => setCommitted(value)} />
                )}
                <output className="sb-playground-value">
                    <code>{describeSelection(committed)}</code>
                </output>
            </div>

            <div className="sb-playground-code">
                <span className="sb-playground-caption">The code for this</span>
                <pre>
                    <code>{buildSnippet(config)}</code>
                </pre>
            </div>
        </div>
    );
}
