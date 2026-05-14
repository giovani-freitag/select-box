import { SubstringFilterStrategy } from "../filters/index.js";
import { indexOptionsByValue, normalizeOptionsToGroups } from "../normalize.js";
import { Store } from "../store.js";
import type {
    AddonTransformContext,
    OptionFilterStrategy,
    SearchMatchRange,
    SelectBoxAddon,
    SelectBoxAddonSnapshots,
    SelectBoxSnapshot,
    SelectGroup,
    SelectOption,
    SingleSelectBoxControllerConfig,
} from "../types.js";


const NO_ACTIVE_INDEX = -1;

function coerceValue(input: string | number | null | undefined): string | null {
    if (input === null || input === undefined) return null;
    return String(input);
}

/**
 * Framework-agnostic state and mutations for a single-select box.
 */
export class SingleSelectBoxController<TExtra extends object = object> {
    private readonly store: Store<SelectBoxSnapshot<TExtra>>;
    private readonly allGroups: ReadonlyArray<SelectGroup<TExtra>>;
    private readonly optionsByValue: ReadonlyMap<string, SelectOption<TExtra>>;
    private readonly defaultFilter: OptionFilterStrategy<TExtra>;
    private explicitFilter: OptionFilterStrategy<TExtra> | null;
    private filterStrategy: OptionFilterStrategy<TExtra>;
    private readonly registeredAddons: SelectBoxAddon<TExtra>[] = [];

    private currentValue: string | null;
    private currentQuery = "";
    private currentOpen = false;
    private currentActiveIndex = NO_ACTIVE_INDEX;
    private readonly boundHighlightRanges = (label: string): ReadonlyArray<SearchMatchRange> =>
        this.getHighlightRanges(label);

    constructor(config: SingleSelectBoxControllerConfig<TExtra>) {
        this.allGroups = normalizeOptionsToGroups({
            options: config.options ?? [],
            ungroupedLabel: config.ungroupedLabel ?? "",
        });
        this.optionsByValue = indexOptionsByValue(this.allGroups);
        this.defaultFilter = new SubstringFilterStrategy<TExtra>();
        this.explicitFilter = config.filter ?? null;
        this.filterStrategy = this.explicitFilter ?? this.defaultFilter;
        this.currentValue = coerceValue(config.initialValue);
        for (const addon of config.addons ?? []) {
            this.registeredAddons.push(addon);
            addon.attach?.();
        }
        this.resolveFilterStrategy();
        this.store = new Store({ initialState: this.buildSnapshot() });
    }

    /** Highlight ranges the active strategy draws for `label` under the current query. */
    getHighlightRanges(label: string): ReadonlyArray<SearchMatchRange> {
        if (this.currentQuery.trim() === "") return [];
        return this.filterStrategy.match(label, this.currentQuery);
    }

    /** Registers an addon, runs its `attach`, and republishes the snapshot. */
    use(addon: SelectBoxAddon<TExtra>): this {
        this.registeredAddons.push(addon);
        addon.attach?.();
        this.resolveFilterStrategy();
        this.publish();
        return this;
    }

    getState(): SelectBoxSnapshot<TExtra> {
        return this.store.getState();
    }

    getFilter(): OptionFilterStrategy<TExtra> {
        return this.filterStrategy;
    }

    /**
     * Sets an explicit filter strategy. An explicit filter always wins over
     * addon-provided ones until cleared.
     */
    setFilter(strategy: OptionFilterStrategy<TExtra>): void {
        if (strategy === this.explicitFilter && strategy === this.filterStrategy) return;
        this.explicitFilter = strategy;
        this.resolveFilterStrategy();
        this.currentActiveIndex = this.firstSelectableIndex(this.computeFilteredGroups());
        this.publish();
    }

    subscribe(listener: () => void): () => void {
        return this.store.subscribe(listener);
    }

    open(): void {
        if (this.currentOpen) return;
        this.currentOpen = true;
        this.currentActiveIndex = this.initialActiveIndexOnOpen();
        this.publish();
    }

    close(): void {
        if (!this.currentOpen) return;
        this.currentOpen = false;
        this.currentActiveIndex = NO_ACTIVE_INDEX;
        this.currentQuery = "";
        this.publish();
    }

    toggle(): void {
        if (this.currentOpen) this.close();
        else this.open();
    }

    setQuery(query: string): void {
        if (query === this.currentQuery) return;
        this.currentQuery = query;
        this.currentActiveIndex = this.firstSelectableIndex(this.computeFilteredGroups());
        this.publish();
    }

    moveActive(delta: number): void {
        const flat = this.flattenSelectable(this.computeFilteredGroups());
        if (flat.length === 0) {
            this.currentActiveIndex = NO_ACTIVE_INDEX;
            this.publish();
            return;
        }
        const current = this.currentActiveIndex === NO_ACTIVE_INDEX ? -1 : this.currentActiveIndex;
        const next = (current + delta + flat.length) % flat.length;
        this.currentActiveIndex = next;
        this.publish();
    }

    commitActive(): void {
        const flat = this.flattenSelectable(this.computeFilteredGroups());
        const target = flat[this.currentActiveIndex];
        if (target) this.commitOption(target);
    }

    commitOption(option: SelectOption<TExtra>): void {
        if (option.disabled) return;
        this.currentValue = option.value;
        this.currentOpen = false;
        this.currentQuery = "";
        this.currentActiveIndex = NO_ACTIVE_INDEX;
        this.publish();
    }

    /** Selects an option by value (coerced to string); no-op when unknown or disabled. */
    commitValue(value: string | number | null): void {
        const coerced = coerceValue(value);
        if (coerced === null) {
            this.clear();
            return;
        }
        const option = this.optionsByValue.get(coerced);
        if (option) this.commitOption(option);
    }

    clear(): void {
        if (this.currentValue === null && this.currentQuery === "") return;
        this.currentValue = null;
        this.currentQuery = "";
        this.currentActiveIndex = NO_ACTIVE_INDEX;
        this.publish();
    }

    destroy(): void {
        for (const addon of this.registeredAddons) {
            addon.detach?.();
        }
        this.registeredAddons.length = 0;
    }

    private publish(): void {
        this.store.setState(this.buildSnapshot());
    }

    private resolveFilterStrategy(): void {
        if (this.explicitFilter !== null) {
            this.filterStrategy = this.explicitFilter;
            return;
        }
        let chosen: OptionFilterStrategy<TExtra> | null = null;
        for (const addon of this.registeredAddons) {
            const provided = addon.provideFilter?.();
            if (provided) chosen = provided;
        }
        this.filterStrategy = chosen ?? this.defaultFilter;
    }

    private buildSnapshot(): SelectBoxSnapshot<TExtra> {
        const filteredGroups = this.computeFilteredGroups();
        const flat = this.flattenSelectable(filteredGroups);
        const activeOption = this.currentActiveIndex === NO_ACTIVE_INDEX
            ? null
            : (flat[this.currentActiveIndex] ?? null);
        const selectedOption = this.currentValue === null
            ? null
            : (this.optionsByValue.get(this.currentValue) ?? null);
        const isEmpty = flat.length === 0;
        const baseSnapshot: SelectBoxSnapshot<TExtra> = {
            open: this.currentOpen,
            query: this.currentQuery,
            value: this.currentValue,
            selectedOption,
            highlightRanges: this.boundHighlightRanges,
            filteredGroups,
            activeIndex: this.currentActiveIndex,
            activeOption,
            isEmpty,
            addons: {},
        };
        return this.applyAddonSnapshots(baseSnapshot);
    }

    private applyAddonSnapshots(snapshot: SelectBoxSnapshot<TExtra>): SelectBoxSnapshot<TExtra> {
        if (this.registeredAddons.length === 0) return snapshot;
        const addonSlices: SelectBoxAddonSnapshots = {};
        for (const addon of this.registeredAddons) {
            if (!addon.extendSnapshot) continue;
            (addonSlices as Record<string, unknown>)[addon.name] = addon.extendSnapshot({ snapshot });
        }
        return { ...snapshot, addons: addonSlices };
    }

    private computeFilteredGroups(): ReadonlyArray<SelectGroup<TExtra>> {
        return this.applyTransformGroups(this.computeFilteredGroupsRaw());
    }

    private computeFilteredGroupsRaw(): ReadonlyArray<SelectGroup<TExtra>> {
        const result: SelectGroup<TExtra>[] = [];
        for (const group of this.allGroups) {
            const filtered = this.filterStrategy.filter(group.options, this.currentQuery);
            if (filtered.length === 0) continue;
            result.push({
                key: group.key,
                label: group.label,
                ...(group.disabled !== undefined ? { disabled: group.disabled } : {}),
                options: filtered,
            });
        }
        return result;
    }

    private applyTransformGroups(
        groups: ReadonlyArray<SelectGroup<TExtra>>,
    ): ReadonlyArray<SelectGroup<TExtra>> {
        if (this.registeredAddons.length === 0) return groups;
        const context = this.buildTransformContext();
        let current = groups;
        for (const addon of this.registeredAddons) {
            if (!addon.transformGroups) continue;
            current = addon.transformGroups(current, context);
        }
        return current;
    }

    private buildTransformContext(): AddonTransformContext<TExtra> {
        const selectedOption = this.currentValue === null
            ? null
            : (this.optionsByValue.get(this.currentValue) ?? null);
        return {
            value: this.currentValue,
            selectedOption,
            query: this.currentQuery,
            open: this.currentOpen,
        };
    }

    private flattenSelectable(
        groups: ReadonlyArray<SelectGroup<TExtra>>,
    ): ReadonlyArray<SelectOption<TExtra>> {
        const flat: SelectOption<TExtra>[] = [];
        for (const group of groups) {
            if (group.disabled) continue;
            for (const option of group.options) {
                if (option.disabled) continue;
                flat.push(option);
            }
        }
        return flat;
    }

    private firstSelectableIndex(groups: ReadonlyArray<SelectGroup<TExtra>>): number {
        return this.flattenSelectable(groups).length === 0 ? NO_ACTIVE_INDEX : 0;
    }

    private initialActiveIndexOnOpen(): number {
        const flat = this.flattenSelectable(this.computeFilteredGroups());
        if (flat.length === 0) return NO_ACTIVE_INDEX;
        if (this.currentValue === null) return 0;
        const selectedIndex = flat.findIndex((option) => option.value === this.currentValue);
        return selectedIndex === -1 ? 0 : selectedIndex;
    }
}
