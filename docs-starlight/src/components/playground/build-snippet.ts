import type { AddonKey, PlaygroundConfig } from "./fixtures.js";

const ADDON_IMPORTS: Record<AddonKey, { readonly symbol: string; readonly from: string }> = {
    "clear-button": { symbol: "ClearButtonAddon", from: "@select-box/addon-clear-button" },
    "hoist-selected": { symbol: "HoistSelectedAddon", from: "@select-box/addon-hoist-selected" },
    fuzzy: { symbol: "FuzzyAddon", from: "@select-box/addon-fuzzy" },
};

function importLines(config: PlaygroundConfig): ReadonlyArray<string> {
    const lines = ['import { SelectBox } from "@select-box/react";'];

    for (const key of config.addons) {
        const addon = ADDON_IMPORTS[key];
        lines.push(`import { ${addon.symbol} } from "${addon.from}";`);
    }

    lines.push('import "@select-box/styles";');

    return lines;
}

function propLines(config: PlaygroundConfig): ReadonlyArray<string> {
    const props = ["options={fruits}"];

    if (config.multiple) props.push("multiple");
    if (config.surface === "inline") props.push('surface="inline"');
    if (config.interactivity === "disabled") props.push("disabled");
    if (config.interactivity === "readOnly") props.push("readOnly");
    if (config.surface === "popover") props.push('placeholder="Pick a fruit"');
    if (config.shape === "grouped") props.push('ungroupedLabel="Citrus"');

    if (config.addons.length > 0) {
        const constructed = config.addons
            .map((key) => `new ${ADDON_IMPORTS[key].symbol}({})`)
            .join(", ");
        props.push(`addons={[${constructed}]}`);
    }

    props.push("onChange={(value) => console.log(value)}");

    return props;
}

/**
 * Renders the playground's current knobs as the JSX a consumer would write.
 *
 * @param config - The knob values currently selected.
 * @returns A self-contained React snippet matching the live preview.
 */
export function buildSnippet(config: PlaygroundConfig): string {
    const imports = importLines(config).join("\n");
    const props = propLines(config)
        .map((prop) => `    ${prop}`)
        .join("\n");

    return `${imports}\n\n<SelectBox\n${props}\n/>`;
}
