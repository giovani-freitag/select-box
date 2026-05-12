import {
    AbstractAddon,
    type OptionFilterStrategy,
    type SelectBoxAddonHost,
} from "@select-box/core";

import {
    FuzzyFilterStrategy,
    type FuzzyFilterStrategyConfig,
} from "./fuzzy-filter-strategy.js";

/**
 * Plug-and-play addon that swaps the host's filter for {@link FuzzyFilterStrategy}
 * on attach and restores the previous one on detach.
 */
export class FuzzyAddon<TExtra extends object = object> extends AbstractAddon<TExtra> {
    readonly name = "fuzzy";

    private readonly strategy: FuzzyFilterStrategy<TExtra>;
    private previousStrategy: OptionFilterStrategy<TExtra> | null = null;

    constructor(config: FuzzyFilterStrategyConfig = {}) {
        super();
        this.strategy = new FuzzyFilterStrategy<TExtra>(config);
    }

    override attach(host: SelectBoxAddonHost<TExtra>): void {
        super.attach(host);
        this.previousStrategy = host.getFilter();
        host.setFilter(this.strategy);
    }

    override detach(): void {
        if (this.host !== null && this.previousStrategy !== null) {
            this.host.setFilter(this.previousStrategy);
        }
        this.previousStrategy = null;
        super.detach();
    }
}
