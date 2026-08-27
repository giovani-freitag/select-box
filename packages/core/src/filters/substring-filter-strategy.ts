import type { SearchMatchRange, SelectOption } from "../types.js";
import { runWhenIdle, type IdleWork } from "../scheduling/idle-work.js";
import { AbstractFilterStrategy } from "./abstract-filter-strategy.js";

const COMBINING_MARKS_PATTERN = /[̀-ͯ]/g;
// Same class without `g`: a global regex carries `lastIndex` across `test` calls.
const SINGLE_COMBINING_MARK = /[̀-ͯ]/;

/**
 * Lists at or below this size are normalized on the spot.
 *
 * Measured at roughly a tenth of a millisecond per thousand labels, so this is
 * the point where preparing eagerly still fits comfortably inside a frame.
 * Below it, scheduling would cost more than the work.
 */
const SYNCHRONOUS_LIMIT = 20_000;

/** Labels normalized per slice, so a long list never holds the main thread. */
const SLICE_SIZE = 2_000;

interface LabelCache {
    readonly labels: Array<string | undefined>;
    filled: number;
}

/**
 * Default filter: case-insensitive AND diacritic-insensitive substring
 * match against `label`. Empty query keeps every option.
 */
export class SubstringFilterStrategy<TExtra extends object = object>
    extends AbstractFilterStrategy<TExtra>
{
    /**
     * Normalized labels, kept per option list.
     *
     * Normalizing is three passes over every label and it dominates the cost of
     * a keystroke on a long list. The result only changes when the options do,
     * so it is keyed on the array the controller hands over and released with it.
     */
    private readonly caches = new WeakMap<ReadonlyArray<SelectOption<TExtra>>, LabelCache>();

    private pending: IdleWork | null = null;

    /**
     * Normalizes this group's labels ahead of the first query.
     *
     * Short lists are done on the spot. A long one is sliced across idle time
     * instead, so handing over a hundred thousand options does not block the
     * frame that does it — and `filter` stays correct meanwhile by normalizing
     * anything the slices have not reached yet.
     *
     * @param options - One group's options, as the filter will receive them.
     */
    override prepare(options: ReadonlyArray<SelectOption<TExtra>>): void {
        const cache = this.cacheFor(options);
        if (cache.filled >= options.length) return;

        if (options.length <= SYNCHRONOUS_LIMIT) {
            this.fillSlice(options, cache, options.length);
            return;
        }

        this.pending?.cancel();
        this.pending = runWhenIdle(() => this.fillSlice(options, cache, SLICE_SIZE));
    }

    override filter(
        options: ReadonlyArray<SelectOption<TExtra>>,
        query: string,
    ): ReadonlyArray<SelectOption<TExtra>> {
        const needle = SubstringFilterStrategy.normalize(query.trim());
        if (needle === "") return options;

        const cache = this.cacheFor(options);

        return options.filter((option, index) => {
            const label =
                cache.labels[index] ??
                (cache.labels[index] = SubstringFilterStrategy.normalize(option.label));
            return label.includes(needle);
        });
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

    /** The cache for an option list, created empty on first sight. */
    private cacheFor(options: ReadonlyArray<SelectOption<TExtra>>): LabelCache {
        const existing = this.caches.get(options);
        if (existing) return existing;

        const cache: LabelCache = { labels: new Array<string | undefined>(options.length), filled: 0 };
        this.caches.set(options, cache);

        return cache;
    }

    /**
     * Normalizes up to `count` more labels.
     *
     * @returns `true` while labels remain unnormalized.
     */
    private fillSlice(
        options: ReadonlyArray<SelectOption<TExtra>>,
        cache: LabelCache,
        count: number,
    ): boolean {
        const end = Math.min(cache.filled + count, options.length);
        for (let index = cache.filled; index < end; index += 1) {
            cache.labels[index] ??= SubstringFilterStrategy.normalize(options[index]!.label);
        }
        cache.filled = end;

        return cache.filled < options.length;
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
