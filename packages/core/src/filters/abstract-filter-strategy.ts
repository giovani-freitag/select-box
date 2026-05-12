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
}
