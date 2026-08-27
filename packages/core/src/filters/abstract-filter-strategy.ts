import type { OptionFilterStrategy, SearchMatchRange, SelectOption } from "../types.js";

/** Base class for filter strategies; subclasses implement `filter` and `match`. */
export abstract class AbstractFilterStrategy<TExtra extends object = object>
    implements OptionFilterStrategy<TExtra>
{
    abstract filter(
        options: ReadonlyArray<SelectOption<TExtra>>,
        query: string,
    ): ReadonlyArray<SelectOption<TExtra>>;

    abstract match(label: string, query: string): ReadonlyArray<SearchMatchRange>;

    /**
     * Builds whatever the strategy needs before the first query.
     *
     * Does nothing by default: a strategy that derives nothing from the labels
     * has nothing to prepare.
     *
     * @param options - One group's options, as the filter will receive them.
     */
    prepare(options: ReadonlyArray<SelectOption<TExtra>>): void {
        void options;
    }
}
