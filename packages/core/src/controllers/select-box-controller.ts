import { SubstringFilterStrategy } from "../filters/index.js";
import { indexOptionsByValue, normalizeOptionsToGroups } from "../normalize.js";
import { SelectBoxSnapshotView } from "../snapshot-view.js";
import { Store } from "../store.js";
import type {
    AddonKeyEffect,
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
/** Everything the filtered-groups pipeline depends on, kept for cache validation. */
interface PipelineCache<TExtra extends object> {
    readonly key: string;
    readonly allGroups: ReadonlyArray<SelectGroup<TExtra>>;
    readonly filterStrategy: OptionFilterStrategy<TExtra>;
    readonly addonCount: number;
    readonly groups: ReadonlyArray<SelectGroup<TExtra>>;
}

export class SelectBoxController<
    TExtra extends object = object,
    TValue extends SelectionValue = string | null,
> {
    private static readonly NO_ACTIVE_INDEX = -1;
    private static readonly EMPTY_OPTIONS: ReadonlyArray<never> = Object.freeze([]);

    private currentMode: SelectionMode;
    private driver: SelectionDriver<TValue>;
    private readonly store: Store<SelectBoxSnapshot<TExtra, TValue>>;
    private allGroups: ReadonlyArray<SelectGroup<TExtra>>;
    private optionsByValue: ReadonlyMap<string, SelectOption<TExtra>>;
    private readonly ungroupedLabel: string;
    private readonly defaultFilter: OptionFilterStrategy<TExtra>;
    private explicitFilter: OptionFilterStrategy<TExtra> | null;
    private filterStrategy: OptionFilterStrategy<TExtra>;
    private readonly registeredAddons: SelectBoxAddon<TExtra>[] = [];

    private currentValue: TValue;
    private currentDisabled: boolean;
    private currentReadOnly: boolean;
    private currentQuery = "";
    private readonly defaultValueInput: SelectionValueInput;
    /** Which transition an async gate is currently deciding, if any. */
    private pendingKind: "open" | "close" | null = null;
    /**
     * Bumped by every open/close request so a resolved async gate can tell
     * whether it is still the latest one. Without it a slow gate would apply its
     * decision on top of whatever the user did while it was in flight.
     */
    private gateGeneration = 0;
    private destroyed = false;
    private pipelineCache: PipelineCache<TExtra> | null = null;
    private currentOpen = false;
    private currentActiveIndex = SelectBoxController.NO_ACTIVE_INDEX;
    private readonly boundHighlightRanges = (label: string): ReadonlyArray<SearchMatchRange> =>
        this.getHighlightRanges(label);

    constructor(config: SelectBoxControllerConfig<TExtra>) {
        this.currentMode = config.mode ?? "single";
        this.driver = SelectBoxController.resolveDriver<TValue>(this.currentMode);
        this.ungroupedLabel = config.ungroupedLabel ?? "";
        this.allGroups = normalizeOptionsToGroups({
            options: config.options ?? [],
            ungroupedLabel: this.ungroupedLabel,
        });
        this.optionsByValue = indexOptionsByValue(this.allGroups);
        this.defaultFilter = new SubstringFilterStrategy<TExtra>();
        this.explicitFilter = config.filter ?? null;
        this.filterStrategy = this.explicitFilter ?? this.defaultFilter;
        // Kept as handed in, not as resolved: a form reset re-resolves it against
        // whatever options are loaded then, the way a native control's default
        // lives in the markup rather than in a snapshot taken at startup.
        this.defaultValueInput = config.initialValue ?? null;
        this.currentValue = this.resolveValueFromInput(config.initialValue);
        this.currentDisabled = config.disabled ?? false;
        this.currentReadOnly = config.readOnly ?? false;
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
    /**
     * Replaces the option list on a live controller.
     *
     * Mirrors a native `<select>` whose `<option>` children changed: the list is
     * re-normalised, the selection is re-resolved against it so keys that no
     * longer name a selectable option drop out, and the highlighted row follows
     * its option rather than its index.
     *
     * @param options - The new flat option list.
     */
    setOptions(options: ReadonlyArray<SelectOption<TExtra>>): void {
        const previousActive = this.activeOption();
        this.allGroups = normalizeOptionsToGroups({
            options,
            ungroupedLabel: this.ungroupedLabel,
        });
        this.optionsByValue = indexOptionsByValue(this.allGroups);
        this.currentValue = this.resolveValueFromInput(this.currentValue);
        this.currentActiveIndex = this.indexOfActiveCandidate(previousActive);
        this.publish();
    }

    /**
     * Refuses or allows interaction, the way a form control's own flags do.
     *
     * `disabled` blocks everything; `readOnly` still lets a user open the list
     * and look around, but refuses typing, committing and clearing. One gate here
     * is what keeps the five wrappers from each growing their own guard.
     *
     * @param flags - Whichever flag changed; the other keeps its current value.
     */
    setInteractivity(flags: { readonly disabled?: boolean; readonly readOnly?: boolean }): void {
        const nextDisabled = flags.disabled ?? this.currentDisabled;
        const nextReadOnly = flags.readOnly ?? this.currentReadOnly;
        if (nextDisabled === this.currentDisabled && nextReadOnly === this.currentReadOnly) return;
        this.currentDisabled = nextDisabled;
        this.currentReadOnly = nextReadOnly;
        if (!this.canChange) this.currentOpen = false;
        this.publish();
    }

    /**
     * Whether the control accepts interaction.
     *
     * Both flags refuse it. They differ outside the controller: a read-only
     * control is still focusable and still submits its value, a disabled one is
     * neither — which is exactly how the native attributes behave.
     */
    private get canChange(): boolean {
        return !this.destroyed && !this.currentDisabled && !this.currentReadOnly;
    }

    getHighlightRanges(label: string): ReadonlyArray<SearchMatchRange> {
        if (this.currentQuery.trim() === "") return [];
        return this.filterStrategy.match(label, this.currentQuery);
    }

    /** Registers an addon, runs its `attach`, and republishes the snapshot. */
    use(addon: SelectBoxAddon<TExtra>): this {
        if (this.destroyed) return this;
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
        if (!this.canChange) return;
        // An open already being decided stays in flight; the opposite request
        // cancels it and leaves the state where it already is.
        if (this.pendingKind === "open") return;
        if (this.pendingKind === "close") {
            this.cancelPendingGate();
            return;
        }
        if (this.currentOpen) return;
        this.runGate("open", () => this.applyOpen());
    }

    close(): void {
        if (this.pendingKind === "close") return;
        if (this.pendingKind === "open") {
            this.cancelPendingGate();
            return;
        }
        if (!this.currentOpen) return;
        this.runGate("close", () => this.applyClose());
    }

    toggle(): void {
        if (this.currentOpen) this.close();
        else this.open();
    }

    setQuery(query: string): void {
        if (!this.canChange) return;
        if (query === this.currentQuery) return;
        this.currentQuery = query;
        this.currentActiveIndex = this.firstSelectableIndex(this.computeFilteredGroups());
        this.publish();
    }

    moveActive(delta: number): void {
        if (!this.canChange) return;
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
        if (!this.canChange) return;
        const flat = this.flattenSelectable(this.computeFilteredGroups());
        const target = flat[this.currentActiveIndex];
        if (target) this.commitOption(target);
    }

    commitOption(option: SelectOption<TExtra>): void {
        if (!this.canChange) return;
        if (option.disabled) return;
        const intercepted = this.applyInterceptCommit(option);
        if (intercepted === null) return;
        option = intercepted;
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
        if (!this.canChange) return;
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

    /**
     * Restores the default selection regardless of the interaction flags.
     *
     * The default is the value the controller was built with, which is what a
     * native control comes back to — resetting a `<select>` restores its
     * preselected option rather than emptying it. Use `clear()` for the
     * emptying a user asks for.
     *
     * A form reset is not a user interaction: the platform resets read-only and
     * disabled controls too, so this deliberately bypasses the gate that
     * `clear()` respects.
     */
    reset(): void {
        this.currentValue = this.resolveValueFromInput(this.defaultValueInput);
        this.currentQuery = "";
        this.currentOpen = false;
        this.currentActiveIndex = SelectBoxController.NO_ACTIVE_INDEX;
        this.publish();
    }

    clear(): void {
        if (!this.canChange) return;
        const empty = this.driver.empty();
        if (Object.is(empty, this.currentValue) && this.currentQuery === "") return;
        this.currentValue = empty;
        this.currentQuery = "";
        this.currentActiveIndex = SelectBoxController.NO_ACTIVE_INDEX;
        this.publish();
    }

    /**
     * Tears the controller down and leaves it inert.
     *
     * Detaches every addon, drops every subscriber, and stops publishing, so a
     * stray call arriving after teardown cannot repaint a surface that is gone.
     * Safe to call more than once.
     */
    destroy(): void {
        if (this.destroyed) return;
        this.destroyed = true;
        for (const addon of this.registeredAddons) {
            addon.detach?.();
        }
        this.registeredAddons.length = 0;
        this.store.clearListeners();
    }

    private publish(): void {
        if (this.destroyed) return;
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

    /** The currently highlighted option, or null when nothing is highlighted. */
    private activeOption(): SelectOption<TExtra> | null {
        if (this.currentActiveIndex === SelectBoxController.NO_ACTIVE_INDEX) return null;
        return this.flattenSelectable(this.computeFilteredGroups())[this.currentActiveIndex] ?? null;
    }

    /** Where a previously highlighted option sits in the current list, if at all. */
    private indexOfActiveCandidate(candidate: SelectOption<TExtra> | null): number {
        if (candidate === null) return SelectBoxController.NO_ACTIVE_INDEX;
        const index = this.flattenSelectable(this.computeFilteredGroups()).findIndex(
            (option) => option.value === candidate.value,
        );
        return index === -1 ? SelectBoxController.NO_ACTIVE_INDEX : index;
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
            disabled: this.currentDisabled,
            readOnly: this.currentReadOnly,
            pending: this.pendingKind !== null,
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

    /**
     * The filtered, addon-transformed groups for the current state.
     *
     * Memoised because a single interaction reads this several times — once to
     * re-anchor the active row, again to build the snapshot — and every read
     * otherwise re-ran the filter and the whole `transformGroups` chain. Hooks
     * are contractually pure transformers, so a cache hit is safe.
     */
    private computeFilteredGroups(): ReadonlyArray<SelectGroup<TExtra>> {
        const key = [
            this.currentMode,
            this.currentOpen ? "open" : "closed",
            this.currentQuery,
            SelectBoxSnapshotView.valueKey(this.currentValue),
        ].join("\u0000");
        const cached = this.pipelineCache;
        if (
            cached !== null
            && cached.key === key
            && cached.allGroups === this.allGroups
            && cached.filterStrategy === this.filterStrategy
            && cached.addonCount === this.registeredAddons.length
        ) {
            return cached.groups;
        }

        const groups = this.applyTransformGroups(this.computeFilteredGroupsRaw());
        this.pipelineCache = {
            key,
            allGroups: this.allGroups,
            filterStrategy: this.filterStrategy,
            addonCount: this.registeredAddons.length,
            groups,
        };
        return groups;
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
        return this.applyTransformOptions(current, context);
    }

    /**
     * Runs the per-group transformers over the settled group list.
     *
     * Ordered after `transformGroups` on purpose: one decides which groups
     * exist, the other what sits inside them, so a group injected by the first
     * is still offered to the second.
     */
    private applyTransformOptions(
        groups: ReadonlyArray<SelectGroup<TExtra>>,
        context: AddonTransformContext<TExtra>,
    ): ReadonlyArray<SelectGroup<TExtra>> {
        const anyTransformer = this.registeredAddons.some(
            (addon) => addon.transformOptions !== undefined,
        );
        if (!anyTransformer) return groups;
        return groups.map((group) => {
            let options = group.options;
            for (const addon of this.registeredAddons) {
                if (addon.transformOptions === undefined) continue;
                options = addon.transformOptions(options, group, context);
            }
            return options === group.options ? group : { ...group, options };
        });
    }

    private applyInterceptCommit(
        option: SelectOption<TExtra>,
    ): SelectOption<TExtra> | null {
        if (this.registeredAddons.length === 0) return option;
        const context = this.buildTransformContext();
        let current: SelectOption<TExtra> | null = option;
        for (const addon of this.registeredAddons) {
            if (!addon.interceptCommit) continue;
            current = addon.interceptCommit(current, context);
            if (current === null) return null;
        }
        return current;
    }

    /**
     * Offers a key to the addons before the built-in bindings see it.
     *
     * @param key - The `KeyboardEvent.key` value being dispatched.
     * @returns `"handled"` when an addon claimed the key.
     */
    offerKey(key: string): "handled" | "pass" {
        for (const addon of this.registeredAddons) {
            if (addon.onKeyDown === undefined) continue;
            const outcome = addon.onKeyDown(key, this.buildTransformContext());
            if (outcome === "pass") continue;
            if (outcome !== "handled") this.applyKeyEffect(outcome);
            return "handled";
        }
        return "pass";
    }

    /**
     * Applies what an addon asked for in response to a key.
     *
     * Selection first, then the query: both a commit and a clear reset the query
     * as part of their own semantics, so a query set alongside either has to
     * land after it or it is silently thrown away.
     */
    private applyKeyEffect(effect: AddonKeyEffect<TExtra>): void {
        if (effect.commitOption !== undefined) this.commitOption(effect.commitOption);
        if (effect.clear === true) this.clear();
        if (effect.query !== undefined) this.setQuery(effect.query);
        if (effect.open === true) this.open();
        else if (effect.open === false) this.close();
    }

    /**
     * Runs an open/close gate, then applies the transition if it was allowed.
     *
     * A gate that answers synchronously keeps the whole transition synchronous —
     * the common case, and the one every wrapper's paint already assumes. Only a
     * promise puts the controller into `pending`, and a stale answer is dropped
     * so the last request wins.
     */
    private runGate(kind: "open" | "close", apply: () => void): void {
        const hook = kind === "open" ? "interceptOpen" : "interceptClose";
        const generation = ++this.gateGeneration;
        const answers: Array<boolean | Promise<boolean>> = [];
        for (const addon of this.registeredAddons) {
            const gate = addon[hook];
            if (!gate) continue;
            answers.push(gate.call(addon, this.buildTransformContext()));
        }
        if (answers.some((answer) => answer === false)) return;
        const pendingAnswers = answers.filter(
            (answer): answer is Promise<boolean> => answer !== true && answer !== false,
        );
        if (pendingAnswers.length === 0) {
            apply();
            return;
        }

        this.pendingKind = kind;
        this.publish();
        void Promise.all(pendingAnswers).then(
            (resolved) => {
                if (generation !== this.gateGeneration) return;
                this.pendingKind = null;
                if (resolved.every((answer) => answer)) apply();
                else this.publish();
            },
            () => {
                if (generation !== this.gateGeneration) return;
                this.pendingKind = null;
                this.publish();
            },
        );
    }

    private cancelPendingGate(): void {
        this.gateGeneration += 1;
        this.pendingKind = null;
        this.publish();
    }

    private applyOpen(): void {
        this.currentOpen = true;
        this.currentActiveIndex = this.initialActiveIndexOnOpen();
        this.publish();
    }

    private applyClose(): void {
        this.currentOpen = false;
        this.currentActiveIndex = SelectBoxController.NO_ACTIVE_INDEX;
        this.currentQuery = "";
        this.publish();
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
