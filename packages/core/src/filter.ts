import type { OptionFilterStrategy, SelectOption } from "./types.js";

/**
 * Default filter: case-insensitive substring match against `label`; empty query keeps every option.
 */
export class SubstringFilterStrategy<TValue> implements OptionFilterStrategy<TValue> {
    filter(
        options: ReadonlyArray<SelectOption<TValue>>,
        query: string,
    ): ReadonlyArray<SelectOption<TValue>> {
        const trimmed = query.trim();
        if (trimmed === "") return options;
        const needle = trimmed.toLowerCase();
        return options.filter((option) => option.label.toLowerCase().includes(needle));
    }
}
