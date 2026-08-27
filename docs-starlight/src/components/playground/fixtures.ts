import type { SelectOption } from "@select-box/core";

/** The knobs the playground can turn, in the shape the preview reads them. */
export interface PlaygroundConfig {
    readonly surface: "popover" | "inline";
    readonly multi: boolean;
    readonly shape: "flat" | "grouped";
    readonly withDisabled: boolean;
    readonly interactivity: "enabled" | "disabled" | "readOnly";
    readonly addons: ReadonlyArray<AddonKey>;
}

export type AddonKey = "clear-button" | "hoist-selected" | "fuzzy";

export const DEFAULT_CONFIG: PlaygroundConfig = {
    surface: "popover",
    multi: false,
    shape: "grouped",
    withDisabled: false,
    interactivity: "enabled",
    addons: [],
};

const FLAT: ReadonlyArray<SelectOption> = [
    { value: "apple", label: "Apple" },
    { value: "pear", label: "Pear" },
    { value: "peach", label: "Peach" },
    { value: "plum", label: "Plum" },
    { value: "lemon", label: "Lemon" },
    { value: "orange", label: "Orange" },
];

const GROUPED: ReadonlyArray<SelectOption> = [
    { value: "apple", label: "Apple", group: "Pomes" },
    { value: "pear", label: "Pear", group: "Pomes" },
    { value: "peach", label: "Peach", group: "Stone fruits" },
    { value: "plum", label: "Plum", group: "Stone fruits" },
    { value: "lemon", label: "Lemon" },
    { value: "orange", label: "Orange" },
];

/** Options matching the chosen shape, with two rows disabled when asked. */
export function optionsFor(config: PlaygroundConfig): ReadonlyArray<SelectOption> {
    const base = config.shape === "grouped" ? GROUPED : FLAT;
    if (!config.withDisabled) return base;

    return base.map((option) =>
        option.value === "pear" || option.value === "orange"
            ? { ...option, disabled: true }
            : option,
    );
}
