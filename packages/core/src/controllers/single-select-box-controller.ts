import { SubstringFilterStrategy } from "../filter.js";
import { normalizeOptionsToGroups } from "../normalize.js";
import { Store } from "../store.js";
import type {
    OptionFilterStrategy,
    SelectBoxAddon,
    SelectBoxAddonSnapshots,
    SelectBoxSnapshot,
    SelectGroup,
    SelectOption,
    SingleSelectBoxConfig,
} from "../types.js";

const NO_ACTIVE_INDEX = -1;

/**
 * Framework-agnostic state and mutations for a single-select combobox.
 */
export class SingleSelectBoxController<TValue> {
    private readonly store: Store<SelectBoxSnapshot<TValue>>;
    private readonly allGroups: ReadonlyArray<SelectGroup<TValue>>;
    private readonly filterStrategy: OptionFilterStrategy<TValue>;
    private readonly registeredAddons: SelectBoxAddon<TValue>[] = [];

    private currentValue: TValue | null;
    private currentQuery = "";
    private currentOpen = false;
    private currentActiveIndex = NO_ACTIVE_INDEX;

    constructor(config: SingleSelectBoxConfig<TValue>) {
        this.allGroups = normalizeOptionsToGroups({
            ...(config.options !== undefined ? { options: config.options } : {}),
            ...(config.groups !== undefined ? { groups: config.groups } : {}),
            ungroupedLabel: config.ungroupedLabel ?? "",
        });
        this.filterStrategy = config.filter ?? new SubstringFilterStrategy<TValue>();
        this.currentValue = config.initialValue ?? null;
        this.store = new Store(this.buildSnapshot());
        for (const addon of config.addons ?? []) {
            this.use(addon);
        }
    }

    /**
     * Registers an addon and publishes a new snapshot reflecting its slice.
     */
    use(addon: SelectBoxAddon<TValue>): this {
        this.registeredAddons.push(addon);
        addon.attach(this.store.getState());
        this.publish();
        return this;
    }

    getState(): SelectBoxSnapshot<TValue> {
        return this.store.getState();
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

    commitOption(option: SelectOption<TValue>): void {
        if (option.disabled) return;
        this.currentValue = option.value;
        this.currentOpen = false;
        this.currentQuery = "";
        this.currentActiveIndex = NO_ACTIVE_INDEX;
        this.publish();
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
            addon.detach();
        }
        this.registeredAddons.length = 0;
    }

    private publish(): void {
        this.store.setState(this.buildSnapshot());
    }

    private buildSnapshot(): SelectBoxSnapshot<TValue> {
        const filteredGroups = this.computeFilteredGroups();
        const flat = this.flattenSelectable(filteredGroups);
        const activeOption = this.currentActiveIndex === NO_ACTIVE_INDEX
            ? null
            : (flat[this.currentActiveIndex] ?? null);
        const selectedOption = this.findOptionByValue(this.currentValue);
        const isEmpty = flat.length === 0;
        const baseSnapshot: SelectBoxSnapshot<TValue> = {
            open: this.currentOpen,
            query: this.currentQuery,
            value: this.currentValue,
            selectedOption,
            filteredGroups,
            activeIndex: this.currentActiveIndex,
            activeOption,
            isEmpty,
            addons: {},
        };
        return this.applyAddonSnapshots(baseSnapshot);
    }

    private applyAddonSnapshots(snapshot: SelectBoxSnapshot<TValue>): SelectBoxSnapshot<TValue> {
        if (this.registeredAddons.length === 0) return snapshot;
        const addonSlices: SelectBoxAddonSnapshots = {};
        for (const addon of this.registeredAddons) {
            if (!addon.extendSnapshot) continue;
            (addonSlices as Record<string, unknown>)[addon.name] = addon.extendSnapshot({ snapshot });
        }
        return { ...snapshot, addons: addonSlices };
    }

    private computeFilteredGroups(): ReadonlyArray<SelectGroup<TValue>> {
        const result: SelectGroup<TValue>[] = [];
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

    private flattenSelectable(
        groups: ReadonlyArray<SelectGroup<TValue>>,
    ): ReadonlyArray<SelectOption<TValue>> {
        const flat: SelectOption<TValue>[] = [];
        for (const group of groups) {
            if (group.disabled) continue;
            for (const option of group.options) {
                if (option.disabled) continue;
                flat.push(option);
            }
        }
        return flat;
    }

    private firstSelectableIndex(groups: ReadonlyArray<SelectGroup<TValue>>): number {
        return this.flattenSelectable(groups).length === 0 ? NO_ACTIVE_INDEX : 0;
    }

    private initialActiveIndexOnOpen(): number {
        const flat = this.flattenSelectable(this.computeFilteredGroups());
        if (flat.length === 0) return NO_ACTIVE_INDEX;
        if (this.currentValue === null) return 0;
        const selectedIndex = flat.findIndex((option) => Object.is(option.value, this.currentValue));
        return selectedIndex === -1 ? 0 : selectedIndex;
    }

    private findOptionByValue(value: TValue | null): SelectOption<TValue> | null {
        if (value === null) return null;
        for (const group of this.allGroups) {
            for (const option of group.options) {
                if (Object.is(option.value, value)) return option;
            }
        }
        return null;
    }
}
