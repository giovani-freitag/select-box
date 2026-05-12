import type { SearchMatchRange } from "./types.js";

export interface HighlightChunk {
    readonly text: string;
    readonly matched: boolean;
}

/**
 * Framework-agnostic helper that splits a label into alternating "plain"
 * and "matched" chunks, ready for any framework's render layer to wrap
 * matched chunks in `<mark>` (or a brand-styled equivalent). Discards
 * zero-length ranges, ignores overlaps by collapsing them into a single
 * span, and clips ranges that extend past the label.
 */
export class TextHighlighter {
    static split(text: string, ranges: ReadonlyArray<SearchMatchRange>): ReadonlyArray<HighlightChunk> {
        if (text === "") return [];
        if (ranges.length === 0) return [{ text, matched: false }];

        const normalized = TextHighlighter.normalizeRanges(text.length, ranges);
        if (normalized.length === 0) return [{ text, matched: false }];

        const chunks: HighlightChunk[] = [];
        let cursor = 0;
        for (const range of normalized) {
            if (range.start > cursor) {
                chunks.push({ text: text.slice(cursor, range.start), matched: false });
            }
            chunks.push({ text: text.slice(range.start, range.end), matched: true });
            cursor = range.end;
        }
        if (cursor < text.length) {
            chunks.push({ text: text.slice(cursor), matched: false });
        }
        return chunks;
    }

    /**
     * Returns ranges sorted by `start` and merged so overlapping or
     * adjacent intervals collapse into one. Empty and out-of-bounds ranges
     * are dropped.
     */
    private static normalizeRanges(
        length: number,
        ranges: ReadonlyArray<SearchMatchRange>,
    ): SearchMatchRange[] {
        const cleaned: SearchMatchRange[] = [];
        for (const range of ranges) {
            const start = Math.max(0, range.start);
            const end = Math.min(length, range.end);
            if (start >= end) continue;
            cleaned.push({ start, end });
        }
        cleaned.sort((left, right) => left.start - right.start);

        const merged: SearchMatchRange[] = [];
        for (const range of cleaned) {
            const last = merged[merged.length - 1];
            if (last && range.start <= last.end) {
                merged[merged.length - 1] = { start: last.start, end: Math.max(last.end, range.end) };
            } else {
                merged.push(range);
            }
        }
        return merged;
    }
}
