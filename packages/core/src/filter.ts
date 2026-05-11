import type { OptionFilterStrategy, SelectOption } from "./types.js";

/**
 * Default filter: case-insensitive substring match against `label`. An
 * empty query keeps every option.
 *
 * Pluggable — consumers can pass any `OptionFilterStrategy` in the
 * controller config. M2 introduces a fuzzy-match strategy as a separate
 * implementation.
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
