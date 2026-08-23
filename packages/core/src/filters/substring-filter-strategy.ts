import type { SearchMatchRange, SelectOption } from "../types.js";
import { AbstractFilterStrategy } from "./abstract-filter-strategy.js";

const COMBINING_MARKS_PATTERN = /[̀-ͯ]/g;
// Same class without `g`: a global regex carries `lastIndex` across `test` calls.
const SINGLE_COMBINING_MARK = /[̀-ͯ]/;

/**
 * Default filter: case-insensitive AND diacritic-insensitive substring
 * match against `label`. Empty query keeps every option.
 */
export class SubstringFilterStrategy<TExtra extends object = object>
    extends AbstractFilterStrategy<TExtra>
{
    override filter(
        options: ReadonlyArray<SelectOption<TExtra>>,
        query: string,
    ): ReadonlyArray<SelectOption<TExtra>> {
        const needle = SubstringFilterStrategy.normalize(query.trim());
        if (needle === "") return options;
        return options.filter((option) =>
            SubstringFilterStrategy.normalize(option.label).includes(needle),
        );
    }

    /**
     * Every case-insensitive, diacritic-insensitive occurrence of `query`
     * inside `label`, expressed in the original label's char positions.
     */
    override match(label: string, query: string): ReadonlyArray<SearchMatchRange> {
        const needle = SubstringFilterStrategy.normalize(query.trim());
        if (needle === "") return [];

        const { normalized, indexMap } = SubstringFilterStrategy.normalizeWithIndexMap(label);
        const ranges: SearchMatchRange[] = [];
        let cursor = 0;
        while (cursor < normalized.length) {
            const found = normalized.indexOf(needle, cursor);
            if (found === -1) break;
            const start = indexMap[found]!;
            const end = SubstringFilterStrategy.extendPastCombiningMarks(
                label,
                indexMap[found + needle.length - 1]! + 1,
            );
            ranges.push({ start, end });
            cursor = found + needle.length;
        }
        return ranges;
    }

    /**
     * Advances an end offset past the combining marks that follow it.
     *
     * Normalization strips those marks, so they never earn an `indexMap` entry.
     * Leaving them outside the range highlights a base letter and renders its
     * own accent unmarked beside it.
     */
    private static extendPastCombiningMarks(label: string, end: number): number {
        let extended = end;
        while (extended < label.length && SINGLE_COMBINING_MARK.test(label[extended]!)) {
            extended += 1;
        }
        return extended;
    }

    private static normalize(text: string): string {
        return text.normalize("NFD").replace(COMBINING_MARKS_PATTERN, "").toLowerCase();
    }

    /**
     * Returns the normalized text plus a `indexMap` that maps every char in
     * the normalized form back to its original position in `label`.
     */
    private static normalizeWithIndexMap(label: string): { normalized: string; indexMap: number[] } {
        let normalized = "";
        const indexMap: number[] = [];
        for (let position = 0; position < label.length; position += 1) {
            const normalizedChar = SubstringFilterStrategy.normalize(label[position]!);
            for (let offset = 0; offset < normalizedChar.length; offset += 1) {
                normalized += normalizedChar[offset];
                indexMap.push(position);
            }
        }
        return { normalized, indexMap };
    }
}
