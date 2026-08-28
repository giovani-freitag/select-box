import { useMemo, useState, type JSX, type ReactElement } from "react";
import { SelectBox } from "@select-box/react";
import { ClearButtonAddon } from "@select-box/addon-clear-button";
import { HoistSelectedAddon } from "@select-box/addon-hoist-selected";
import { FuzzyAddon } from "@select-box/addon-fuzzy";
import type { SelectBoxAddon } from "@select-box/core";

import { buildSnippet } from "./build-snippet.js";
import { DEFAULT_CONFIG, optionsFor, type AddonKey, type PlaygroundConfig } from "./fixtures.js";

// Every knob renders inline, so each label has to read as a chip: the value it
// sets, and nothing else. What each one means is the preview underneath.
const SURFACES = [
    { value: "popover", label: "Popover" },
    { value: "inline", label: "Inline" },
];

const CARDINALITIES = [
    { value: "single", label: "Single" },
    { value: "multiple", label: "Multiple" },
];

const SHAPES = [
    { value: "grouped", label: "Grouped" },
    { value: "flat", label: "Flat" },
];

const ROW_STATES = [
    { value: "all", label: "All selectable" },
    { value: "some-disabled", label: "Two disabled" },
];

const INTERACTIVITY = [
    { value: "enabled", label: "Enabled" },
    { value: "disabled", label: "Disabled" },
    { value: "readOnly", label: "Read-only" },
];

const ADDONS = [
    { value: "clear-button", label: "Clear button" },
    { value: "hoist-selected", label: "Hoist selected" },
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
                surface="inline"
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
                    value={config.multiple ? "multiple" : "single"}
                    onPick={(next) => update("multiple", next === "multiple")}
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
                        multiple
                        surface="inline"
                        options={ADDONS}
                        defaultValue={[]}
                        aria-label="Addons"
                        onChange={(values) => update("addons", values as ReadonlyArray<AddonKey>)}
                    />
                </div>
            </div>

            <div className="sb-playground-stage">
                <span className="sb-playground-caption">Live preview</span>
                {config.multiple ? (
                    <SelectBox
                        {...shared}
                        multiple
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
