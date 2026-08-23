import { SubstringFilterStrategy } from "../filters/index.js";
import { indexOptionsByValue, normalizeOptionsToGroups } from "../normalize.js";
import { Store } from "../store.js";
import type {
    AddonTransformContext,
    OptionFilterStrategy,
    SearchMatchRange,
    SelectBoxAddon,
    SelectBoxAddonSnapshots,
    SelectBoxControllerConfig,
    SelectBoxSnapshot,
    SelectGroup,
    SelectionDriver,
    SelectionMode,
    SelectionValue,
    SelectionValueInput,
    SelectOption,
} from "../types.js";
import { MultiSelectionDriver } from "./multi-selection-driver.js";
import { SingleSelectionDriver } from "./single-selection-driver.js";

/**
 * Unified controller for both single- and multi-select boxes. Selection
 * cardinality is delegated to a pluggable `SelectionDriver` (single replaces;
 * multi toggles). Everything else — open/close, filtering, virtualizer math,
 * keyboard nav, ARIA wiring, addon host — is shared.
 *
 * Prefer the `SingleSelectBoxController` / `MultiSelectBoxController` sugar
 * subclasses in consumer code; this class is exposed so advanced callers can
 * inject a custom driver.
 */
export class SelectBoxController<
    TExtra extends object = object,
    TValue extends SelectionValue = string | null,
> {
    private static readonly NO_ACTIVE_INDEX = -1;
    private static readonly EMPTY_OPTIONS: ReadonlyArray<never> = Object.freeze([]);

    private currentMode: SelectionMode;
    private driver: SelectionDriver<TValue>;
    private readonly store: Store<SelectBoxSnapshot<TExtra, TValue>>;
    private readonly allGroups: ReadonlyArray<SelectGroup<TExtra>>;
    private readonly optionsByValue: ReadonlyMap<string, SelectOption<TExtra>>;
    private readonly defaultFilter: OptionFilterStrategy<TExtra>;
    private explicitFilter: OptionFilterStrategy<TExtra> | null;
    private filterStrategy: OptionFilterStrategy<TExtra>;
    private readonly registeredAddons: SelectBoxAddon<TExtra>[] = [];

    private currentValue: TValue;
    private currentQuery = "";
    private currentOpen = false;
    private currentActiveIndex = SelectBoxController.NO_ACTIVE_INDEX;
    private readonly boundHighlightRanges = (label: string): ReadonlyArray<SearchMatchRange> =>
        this.getHighlightRanges(label);

    constructor(config: SelectBoxControllerConfig<TExtra>) {
        this.currentMode = config.mode ?? "single";
        this.driver = SelectBoxController.resolveDriver<TValue>(this.currentMode);
        this.allGroups = normalizeOptionsToGroups({
            options: config.options ?? [],
            ungroupedLabel: config.ungroupedLabel ?? "",
        });
        this.optionsByValue = indexOptionsByValue(this.allGroups);
        this.defaultFilter = new SubstringFilterStrategy<TExtra>();
        this.explicitFilter = config.filter ?? null;
        this.filterStrategy = this.explicitFilter ?? this.defaultFilter;
        this.currentValue = this.resolveValueFromInput(config.initialValue);
        for (const addon of config.addons ?? []) {
            this.registeredAddons.push(addon);
            addon.attach?.();
        }
        this.resolveFilterStrategy();
        this.store = new Store({ initialState: this.buildSnapshot() });
    }

    /** Current selection cardinality. Mutable via `setMode`. */
    get mode(): SelectionMode {
        return this.currentMode;
    }

    /**
     * Switches selection cardinality at runtime, preserving the current value
     * by re-coercing it through the new driver — single→multi wraps the held
     * key as a singleton array, multi→single keeps the first selected key.
     * No-op when already in the requested mode.
     */
    setMode(nextMode: SelectionMode): void {
        if (nextMode === this.currentMode) return;
        const nextDriver = SelectBoxController.resolveDriver<TValue>(nextMode);
        const carried = nextDriver.coerce(this.currentValue);
        this.currentMode = nextMode;
        this.driver = nextDriver;
        this.currentValue = carried;
        this.currentActiveIndex = SelectBoxController.NO_ACTIVE_INDEX;
        if (this.currentOpen) {
            this.currentActiveIndex = this.initialActiveIndexOnOpen();
        }
        this.publish();
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

    getState(): SelectBoxSnapshot<TExtra, TValue> {
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
        this.currentActiveIndex = SelectBoxController.NO_ACTIVE_INDEX;
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
            this.currentActiveIndex = SelectBoxController.NO_ACTIVE_INDEX;
            this.publish();
            return;
        }
        const current = this.currentActiveIndex === SelectBoxController.NO_ACTIVE_INDEX ? -1 : this.currentActiveIndex;
        const next = (((current + delta) % flat.length) + flat.length) % flat.length;
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
        const next = this.driver.commit(this.currentValue, option);
        if (Object.is(next, this.currentValue)) return;
        this.currentValue = next;
        if (this.driver.closeOnCommit) {
            this.currentOpen = false;
            this.currentQuery = "";
            this.currentActiveIndex = SelectBoxController.NO_ACTIVE_INDEX;
        }
        this.publish();
    }

    /**
     * Replaces the current selection from a raw input. Accepts a single value
     * (single-mode shorthand), an array of values (multi-mode), or `null` to
     * clear. The active driver coerces; unknown values are silently dropped.
     */
    commitValue(input: SelectionValueInput): void {
        const next = this.resolveValueFromInput(input);
        if (Object.is(next, this.currentValue)) return;
        this.currentValue = next;
        if (this.driver.closeOnCommit) {
            this.currentOpen = false;
            this.currentQuery = "";
            this.currentActiveIndex = SelectBoxController.NO_ACTIVE_INDEX;
        }
        this.publish();
    }

    clear(): void {
        const empty = this.driver.empty();
        if (Object.is(empty, this.currentValue) && this.currentQuery === "") return;
        this.currentValue = empty;
        this.currentQuery = "";
        this.currentActiveIndex = SelectBoxController.NO_ACTIVE_INDEX;
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

    /**
     * Coerces a raw input via the driver, then prunes unknown / disabled keys
     * so the controller never holds dangling selection values.
     */
    private resolveValueFromInput(input: SelectionValueInput): TValue {
        const coerced = this.driver.coerce(input);
        const validKeys = this.driver.keys(coerced).filter((key) => {
            const option = this.optionsByValue.get(key);
            return option !== undefined && option.disabled !== true;
        });
        if (validKeys.length === this.driver.keys(coerced).length) return coerced;
        // Rebuild a valid value through the driver — handles both single and multi shapes.
        return validKeys.length === 0
            ? this.driver.empty()
            : this.commitFromKeys(validKeys);
    }

    /** Replays a list of selection keys through `driver.commit` to produce the canonical value. */
    private commitFromKeys(keys: ReadonlyArray<string>): TValue {
        let value: TValue = this.driver.empty();
        for (const key of keys) {
            const option = this.optionsByValue.get(key);
            if (!option) continue;
            value = this.driver.commit(value, option);
        }
        return value;
    }

    private buildSnapshot(): SelectBoxSnapshot<TExtra, TValue> {
        const filteredGroups = this.computeFilteredGroups();
        const flat = this.flattenSelectable(filteredGroups);
        const activeOption = this.currentActiveIndex === SelectBoxController.NO_ACTIVE_INDEX
            ? null
            : (flat[this.currentActiveIndex] ?? null);
        const selectedOptions = this.resolveSelectedOptions();
        const selectedOption = selectedOptions[0] ?? null;
        const isEmpty = flat.length === 0;
        const baseSnapshot: SelectBoxSnapshot<TExtra, TValue> = {
            mode: this.mode,
            open: this.currentOpen,
            query: this.currentQuery,
            value: this.currentValue,
            selectedOption,
            selectedOptions,
            highlightRanges: this.boundHighlightRanges,
            filteredGroups,
            activeIndex: this.currentActiveIndex,
            activeOption,
            isEmpty,
            addons: {},
        };
        return this.applyAddonSnapshots(baseSnapshot);
    }

    private resolveSelectedOptions(): ReadonlyArray<SelectOption<TExtra>> {
        const keys = this.driver.keys(this.currentValue);
        if (keys.length === 0) return SelectBoxController.EMPTY_OPTIONS;
        const result: SelectOption<TExtra>[] = [];
        for (const key of keys) {
            const option = this.optionsByValue.get(key);
            if (option) result.push(option);
        }
        return result;
    }

    private applyAddonSnapshots(
        snapshot: SelectBoxSnapshot<TExtra, TValue>,
    ): SelectBoxSnapshot<TExtra, TValue> {
        if (this.registeredAddons.length === 0) return snapshot;
        const addonSlices: SelectBoxAddonSnapshots = {};
        for (const addon of this.registeredAddons) {
            if (!addon.extendSnapshot) continue;
            (addonSlices as Record<string, unknown>)[addon.name] = addon.extendSnapshot({
                snapshot,
            });
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
        const selectedOptions = this.resolveSelectedOptions();
        return {
            mode: this.mode,
            value: this.currentValue,
            selectedOption: selectedOptions[0] ?? null,
            selectedOptions,
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
        return this.flattenSelectable(groups).length === 0 ? SelectBoxController.NO_ACTIVE_INDEX : 0;
    }

    private initialActiveIndexOnOpen(): number {
        const flat = this.flattenSelectable(this.computeFilteredGroups());
        if (flat.length === 0) return SelectBoxController.NO_ACTIVE_INDEX;
        const firstSelectedKey = this.driver.keys(this.currentValue)[0];
        if (firstSelectedKey === undefined) return 0;
        const selectedIndex = flat.findIndex((option) => option.value === firstSelectedKey);
        return selectedIndex === -1 ? 0 : selectedIndex;
    }

    private static resolveDriver<TValue extends SelectionValue>(
        mode: SelectionMode,
    ): SelectionDriver<TValue> {
        const driver = mode === "multi" ? new MultiSelectionDriver() : new SingleSelectionDriver();
        return driver as unknown as SelectionDriver<TValue>;
    }
}
