import type { OptionFilterStrategy, SearchMatchRange, SelectOption } from "./types.js";

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

    /**
     * Returns every occurrence of `query` (case-insensitive) inside `label`
     * as a half-open range. UI consumers feed the result through
     * {@link TextHighlighter.split} to render `<mark>` spans.
     */
    match(label: string, query: string): ReadonlyArray<SearchMatchRange> {
        const trimmed = query.trim();
        if (trimmed === "") return [];
        const needle = trimmed.toLowerCase();
        const haystack = label.toLowerCase();
        const ranges: SearchMatchRange[] = [];
        let cursor = 0;
        while (cursor < haystack.length) {
            const found = haystack.indexOf(needle, cursor);
            if (found === -1) break;
            ranges.push({ start: found, end: found + needle.length });
            cursor = found + needle.length;
        }
        return ranges;
    }
}

const WORD_BOUNDARY_PATTERN = /[\s\-_./]/;
const CONSECUTIVE_BONUS = 8;
const WORD_START_BONUS = 10;
const PREFIX_PENALTY_PER_CHAR = 0.5;

/**
 * Fuzzy subsequence filter: every query character must appear in `label`
 * in order (gaps allowed). Surviving options are scored and returned
 * highest-first. Scoring rewards:
 *
 * - **Consecutive** matches — quadratic-ish bonus so "abc" beats "a_b_c".
 * - **Word-start** matches — letters at the beginning of the label or
 *   right after a separator (` `, `-`, `_`, `/`, `.`) score higher.
 * - **Early matches** — small penalty for each character skipped before
 *   the first query char lands; helps prefixes win over suffixes.
 *
 * Stable: ties keep the input order. Plugged into the controller via
 * `new SingleSelectBoxController({ filter: new FuzzyFilterStrategy() })`.
 */
export class FuzzyFilterStrategy<TExtra extends object = object>
    implements OptionFilterStrategy<TExtra>
{
    filter(
        options: ReadonlyArray<SelectOption<TExtra>>,
        query: string,
    ): ReadonlyArray<SelectOption<TExtra>> {
        const trimmed = query.trim();
        if (trimmed === "") return options;
        const needle = trimmed.toLowerCase();

        const scored: Array<{ option: SelectOption<TExtra>; score: number; index: number }> = [];
        for (let index = 0; index < options.length; index += 1) {
            const option = options[index]!;
            const score = this.scoreNeedleAgainstHaystack(needle, option.label.toLowerCase());
            if (score === null) continue;
            scored.push({ option, score, index });
        }

        scored.sort((left, right) => {
            if (left.score !== right.score) return right.score - left.score;
            return left.index - right.index;
        });

        return scored.map((entry) => entry.option);
    }

    /**
     * Returns the relative match score for `query` against `label`, or
     * `null` when `query` is not a subsequence of `label`. Public surface
     * so consumers building custom UI (highlighted labels, popover sort
     * indicators) can inspect the same ranking the filter applies.
     *
     * Lower-cases both inputs internally to mirror `filter`'s behaviour.
     */
    score(label: string, query: string): number | null {
        const trimmed = query.trim();
        if (trimmed === "") return 0;
        return this.scoreNeedleAgainstHaystack(trimmed.toLowerCase(), label.toLowerCase());
    }

    /**
     * Returns the positions of every query character that matched `label`,
     * collapsed into contiguous ranges. Empty when `query` is empty or no
     * subsequence match exists.
     */
    match(label: string, query: string): ReadonlyArray<SearchMatchRange> {
        const trimmed = query.trim();
        if (trimmed === "") return [];
        const needle = trimmed.toLowerCase();
        const haystack = label.toLowerCase();
        const ranges: SearchMatchRange[] = [];
        let queryIndex = 0;

        for (let position = 0; position < haystack.length && queryIndex < needle.length; position += 1) {
            if (haystack[position] !== needle[queryIndex]) continue;
            const last = ranges[ranges.length - 1];
            if (last && last.end === position) {
                ranges[ranges.length - 1] = { start: last.start, end: position + 1 };
            } else {
                ranges.push({ start: position, end: position + 1 });
            }
            queryIndex += 1;
        }
        if (queryIndex < needle.length) return [];
        return ranges;
    }

    private scoreNeedleAgainstHaystack(needle: string, haystack: string): number | null {
        if (needle.length === 0) return 0;
        if (needle.length > haystack.length) return null;

        let queryIndex = 0;
        let score = 0;
        let consecutive = 0;
        let firstMatchIndex = -1;

        for (let position = 0; position < haystack.length; position += 1) {
            if (haystack[position] !== needle[queryIndex]) {
                consecutive = 0;
                continue;
            }
            if (firstMatchIndex === -1) firstMatchIndex = position;

            const previous = haystack[position - 1];
            const isWordStart =
                position === 0 || (previous !== undefined && WORD_BOUNDARY_PATTERN.test(previous));
            if (isWordStart) score += WORD_START_BONUS;

            consecutive += 1;
            if (consecutive > 1) score += CONSECUTIVE_BONUS * (consecutive - 1);

            queryIndex += 1;
            if (queryIndex === needle.length) break;
        }

        if (queryIndex < needle.length) return null;
        score -= firstMatchIndex * PREFIX_PENALTY_PER_CHAR;
        return score;
    }
}
