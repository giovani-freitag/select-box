import type { OptionFilterStrategy, SelectOption } from "./types.js";

/**
 * Default filter: case-insensitive substring match against `label`; empty query keeps every option.
 */
export class SubstringFilterStrategy<TExtra extends object = object>
    implements OptionFilterStrategy<TExtra>
{
    filter(
        options: ReadonlyArray<SelectOption<TExtra>>,
        query: string,
    ): ReadonlyArray<SelectOption<TExtra>> {
        const trimmed = query.trim();
        if (trimmed === "") return options;
        const needle = trimmed.toLowerCase();
        return options.filter((option) => option.label.toLowerCase().includes(needle));
    }
}
