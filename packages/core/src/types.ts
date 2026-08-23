/**
 * Reserved keys owned by SelectOption. User-supplied `TExtra` must avoid these
 * names; TypeScript refuses to merge with the base if collisions appear.
 */
export interface SelectOptionBase {
    readonly value: string;
    readonly label: string;
    readonly disabled?: boolean;
    /** Optional group key — leaf options sharing a key are bundled together. */
    readonly group?: string;
}

/**
 * Flat option shape. `value` is the unique identifier (coerced to string on
 * normalization); `label` is what the UI renders. Any extra domain fields
 * (id, slug, metadata) ride on the same object via the `TExtra` generic and
 * come back untouched in `selectedOption` / `onChange`.
 */
export type SelectOption<TExtra extends object = object> = SelectOptionBase & TExtra;

export interface SelectGroup<TExtra extends object = object> {
    readonly key: string;
    readonly label: string;
    readonly disabled?: boolean;
    readonly options: ReadonlyArray<SelectOption<TExtra>>;
}

/** Half-open `[start, end)` char range, slice-compatible. */
export interface SearchMatchRange {
    readonly start: number;
    readonly end: number;
}

/**
 * Contract every filter strategy implements: pick which options survive
 * the query and report which char ranges match for UI highlighting.
 */
export interface OptionFilterStrategy<TExtra extends object = object> {
    filter(
        options: ReadonlyArray<SelectOption<TExtra>>,
        query: string,
    ): ReadonlyArray<SelectOption<TExtra>>;
    match(label: string, query: string): ReadonlyArray<SearchMatchRange>;
}

/**
 * Augmented by addon packages via declaration merging; each addon adds its keyed slice.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface SelectBoxAddonSnapshots {}

/** Selection cardinality. `"single"` keeps one option at a time; `"multi"` accumulates a list. */
export type SelectionMode = "single" | "multi";

/**
 * Canonical value shape carried by the controller. The `string | null` arm is
 * used by single-mode controllers; the `ReadonlyArray<string>` arm is used by
 * multi-mode controllers. Consumer-facing API surfaces fix this generic via
 * `SingleSelectBoxController` / `MultiSelectBoxController` so app code never
 * has to narrow on the bare union.
 */
export type SelectionValue = string | null | ReadonlyArray<string>;

/**
 * Anything a consumer may hand to `initialValue` / `commitValue`. The active
 * `SelectionDriver` coerces this into the canonical `SelectionValue` shape.
 */
export type SelectionValueInput =
    | string
    | number
    | ReadonlyArray<string | number>
    | null
    | undefined;

/**
 * Mode-specific commit/clear/coerce behavior. Drivers are pure transformers —
 * they receive the current value, return the next value, and never reach back
 * into the controller. Lifetime is `new Driver()` per controller; no shared
 * state.
 */
export interface SelectionDriver<TValue extends SelectionValue> {
    readonly mode: SelectionMode;
    /** `true` when commit should also close the popover (single mode); `false` to stay open (multi). */
    readonly closeOnCommit: boolean;
    /** The "nothing selected" value for this mode. */
    empty(): TValue;
    /** Normalises a raw consumer input (numeric, array, null) into the canonical value shape. */
    coerce(input: SelectionValueInput): TValue;
    /** Replace-or-toggle semantics. Always returns a new value reference when content changes. */
    commit(current: TValue, option: SelectOptionBase): TValue;
    /** Whether the given option key participates in the current selection. */
    contains(value: TValue, optionValue: string): boolean;
    /** Flat list of selected option keys, in selection order. Used to resolve to options. */
    keys(value: TValue): ReadonlyArray<string>;
}

/**
 * Live snapshot exposed by every wrapper. Carries both `selectedOption`
 * (the first/only option, `null` when nothing is selected) and
 * `selectedOptions` (full list, `[]` when nothing is selected) so that
 * mode-agnostic consumer code can read whichever shape it prefers.
 */
export interface SelectBoxSnapshot<
    TExtra extends object = object,
    TValue extends SelectionValue = string | null,
> {
    readonly mode: SelectionMode;
    readonly open: boolean;
    readonly query: string;
    readonly value: TValue;
    /** First option in the current selection, or `null` when nothing is selected. */
    readonly selectedOption: SelectOption<TExtra> | null;
    /** Every option in the current selection (length 0 or 1 in single mode). */
    readonly selectedOptions: ReadonlyArray<SelectOption<TExtra>>;
    readonly filteredGroups: ReadonlyArray<SelectGroup<TExtra>>;
    readonly activeIndex: number;
    readonly activeOption: SelectOption<TExtra> | null;
    readonly isEmpty: boolean;
    /** Refuses every interaction, like a disabled form control. */
    readonly disabled: boolean;
    /** Allows looking but not changing: no typing, no commit, no clear. */
    readonly readOnly: boolean;
    /** Highlight ranges the active strategy draws for `label` under the current query. */
    readonly highlightRanges: (label: string) => ReadonlyArray<SearchMatchRange>;
    readonly addons: Readonly<SelectBoxAddonSnapshots>;
}

/**
 * Read-only context passed to post-snapshot hooks (e.g. `extendSnapshot`).
 */
export interface AddonHookContext<TExtra extends object = object> {
    readonly snapshot: SelectBoxSnapshot<TExtra, SelectionValue>;
}

/**
 * Read-only context passed to pre-snapshot hooks (e.g. `transformGroups`).
 * Carries only the state that is settled before the groups pipeline runs —
 * `filteredGroups`, `activeIndex`, and `activeOption` are intentionally absent
 * because the hook is producing (or shifting) them.
 */
export interface AddonTransformContext<TExtra extends object = object> {
    readonly mode: SelectionMode;
    /** Canonical value in its mode-specific shape. */
    readonly value: SelectionValue;
    /** First selected option (or `null`). */
    readonly selectedOption: SelectOption<TExtra> | null;
    /** Every selected option (empty in "no selection" or single-mode-with-null). */
    readonly selectedOptions: ReadonlyArray<SelectOption<TExtra>>;
    readonly query: string;
    readonly open: boolean;
}

/**
 * Plugin contract. Addons compose behavior through typed hooks; they never
 * receive a mutable controller reference, so a hook cannot trigger a state
 * mutation from inside the publish path.
 *
 * Lifecycle hooks (`attach`/`detach`) are for side-effectful setup the addon
 * owns itself (timers, external listeners). They receive no arguments and
 * cannot reach back into the controller.
 */
export interface SelectBoxAddon<TExtra extends object = object> {
    readonly name: string;
    /** Optional one-time setup; called when the addon is registered. */
    attach?(): void;
    /** Optional teardown; called on `controller.destroy()`. */
    detach?(): void;
    /**
     * Optional filter provider. If multiple addons provide, the last-registered
     * wins. An explicit `config.filter` or `controller.setFilter(...)` always
     * overrides providers.
     */
    provideFilter?(): OptionFilterStrategy<TExtra>;
    /**
     * Optional pure transformer over the filtered groups, before the snapshot
     * settles. Multiple addons compose in registration order: the first sees
     * the raw filter output, each subsequent one sees the previous output.
     */
    transformGroups?(
        groups: ReadonlyArray<SelectGroup<TExtra>>,
        context: AddonTransformContext<TExtra>,
    ): ReadonlyArray<SelectGroup<TExtra>>;
    /** Optional snapshot extension; return value lands at `snapshot.addons[name]`. */
    extendSnapshot?(context: AddonHookContext<TExtra>): unknown;
}

/** Options + filter + addon configuration shared by every controller flavour. */
export interface SelectBoxControllerCommonConfig<TExtra extends object = object> {
    /** Flat options. Leaves with a `group` key are bundled into that group. */
    readonly options?: ReadonlyArray<SelectOption<TExtra>>;
    /** Custom filter; defaults to case-insensitive substring match. */
    readonly filter?: OptionFilterStrategy<TExtra>;
    /** Label rendered for the synthetic group that holds ungrouped options. */
    readonly ungroupedLabel?: string;
    /** Addons registered before the first snapshot. Equivalent to calling `.use()` in order. */
    readonly addons?: ReadonlyArray<SelectBoxAddon<TExtra>>;
    /** Refuses every interaction, like a disabled form control. Defaults to `false`. */
    readonly disabled?: boolean;
    /** Allows looking but not changing. Defaults to `false`. */
    readonly readOnly?: boolean;
}

/** Config accepted by the unified `SelectBoxController`. The `mode` flag picks the default driver. */
export interface SelectBoxControllerConfig<TExtra extends object = object>
    extends SelectBoxControllerCommonConfig<TExtra> {
    /** Defaults to `"single"`. */
    readonly mode?: SelectionMode;
    /** Initial selection — single value for "single", array for "multi", `null` for empty. */
    readonly initialValue?: SelectionValueInput;
}

/** Config accepted by `SingleSelectBoxController`. */
export interface SingleSelectBoxControllerConfig<TExtra extends object = object>
    extends SelectBoxControllerCommonConfig<TExtra> {
    /** Initial selected value (coerced to string). */
    readonly initialValue?: string | number | null;
}

/** Config accepted by `MultiSelectBoxController`. */
export interface MultiSelectBoxControllerConfig<TExtra extends object = object>
    extends SelectBoxControllerCommonConfig<TExtra> {
    /** Initial selected values (each coerced to string; duplicates dropped). */
    readonly initialValue?: ReadonlyArray<string | number>;
}
