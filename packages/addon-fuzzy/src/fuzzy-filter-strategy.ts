import {
    AbstractFilterStrategy,
    type SearchMatchRange,
    type SelectOption,
} from "@select-box/core";
import Fuse, { type FuseOptionKey, type IFuseOptions } from "fuse.js";

/** Any fuse.js option; the strategy merges them with its own required defaults. */
export type FuzzyFilterStrategyConfig<TExtra extends object = object> =
    IFuseOptions<SelectOption<TExtra>>;

/**
 * Bitap-based fuzzy filter backed by `fuse.js`. Tolerates typos and gaps;
 * surviving options are returned in fuse's score order (best first).
 *
 * User config flows through to fuse; the strategy only forces the four
 * options it depends on (`includeMatches`, `includeScore`, `findAllMatches`)
 * and ensures `"label"` is in `keys` (user-supplied keys are kept).
 */
export class FuzzyFilterStrategy<TExtra extends object = object>
    extends AbstractFilterStrategy<TExtra>
{
    private readonly fuseOptions: IFuseOptions<SelectOption<TExtra>>;

    constructor(config: FuzzyFilterStrategyConfig<TExtra> = {}) {
        super();
        this.fuseOptions = {
            ...config,
            keys: FuzzyFilterStrategy.mergeKeysWithLabel(config.keys),
            includeScore: true,
            includeMatches: true,
            findAllMatches: true,
        };
    }

    override filter(
        options: ReadonlyArray<SelectOption<TExtra>>,
        query: string,
    ): ReadonlyArray<SelectOption<TExtra>> {
        if (query.trim() === "") return options;
        const fuse = new Fuse([...options], this.fuseOptions);
        return fuse.search(query).map((result) => result.item);
    }

    /** Matched char ranges fuse would draw for `label` under `query`. */
    override match(label: string, query: string): ReadonlyArray<SearchMatchRange> {
        if (query.trim() === "") return [];
        const singletonFuse = new Fuse(
            [{ label }],
            this.fuseOptions as IFuseOptions<{ label: string }>,
        );
        const indices = singletonFuse.search(query)[0]?.matches?.[0]?.indices ?? [];
        return indices.map(([start, end]) => ({ start, end: end + 1 }));
    }

    private static mergeKeysWithLabel<TExtra extends object>(
        userKeys: ReadonlyArray<FuseOptionKey<SelectOption<TExtra>>> | undefined,
    ): Array<FuseOptionKey<SelectOption<TExtra>>> {
        if (userKeys === undefined || userKeys.length === 0) return ["label"];
        const alreadyIncludesLabel = userKeys.some((key) => {
            if (typeof key === "string") return key === "label";
            if (Array.isArray(key)) return key.length === 1 && key[0] === "label";
            return key.name === "label";
        });
        return alreadyIncludesLabel ? [...userKeys] : ["label", ...userKeys];
    }
}
