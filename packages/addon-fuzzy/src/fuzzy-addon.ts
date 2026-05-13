import {
    AbstractAddon,
    type OptionFilterStrategy,
} from "@select-box/core";

import {
    FuzzyFilterStrategy,
    type FuzzyFilterStrategyConfig,
} from "./fuzzy-filter-strategy.js";

/**
 * Plug-and-play addon that contributes {@link FuzzyFilterStrategy} as the
 * controller's filter via `provideFilter`. An explicit `config.filter` or
 * `controller.setFilter(...)` overrides this provider.
 */
export class FuzzyAddon<TExtra extends object = object> extends AbstractAddon<TExtra> {
    readonly name = "fuzzy";

    private readonly strategy: FuzzyFilterStrategy<TExtra>;

    constructor(config: FuzzyFilterStrategyConfig = {}) {
        super();
        this.strategy = new FuzzyFilterStrategy<TExtra>(config);
    }

    provideFilter(): OptionFilterStrategy<TExtra> {
        return this.strategy;
    }
}
