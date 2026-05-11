/**
 * Public types shared by every controller and wrapper.
 *
 * The library accepts options either as a flat list with an optional
 * `group` key, or as pre-built `SelectGroup` records. The controller
 * always normalises both inputs into an ordered list of groups and
 * publishes them through the snapshot as `filteredGroups`.
 */

export interface SelectOption<TValue> {
    readonly value: TValue;
    readonly label: string;
    readonly disabled?: boolean;
    /** Optional group key — leaf options sharing a key are grouped together. */
    readonly group?: string;
}

export interface SelectGroup<TValue> {
    readonly key: string;
    readonly label: string;
    readonly disabled?: boolean;
    readonly options: ReadonlyArray<SelectOption<TValue>>;
}

/**
 * Strategy that filters options against the current query. Returns the
 * subset that should remain visible. The default implementation is a
 * case-insensitive substring match on the label.
 */
export interface OptionFilterStrategy<TValue> {
    filter(
        options: ReadonlyArray<SelectOption<TValue>>,
        query: string,
    ): ReadonlyArray<SelectOption<TValue>>;
}

/**
 * Augmented by addon packages via declaration merging. Each first-party
 * addon adds an optional entry keyed by its `name`, so consumers read
 * `snapshot.addons["clear-button"]` etc. with full type safety once the
 * addon's package is installed.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface SelectBoxAddonSnapshots {}

export interface SelectBoxSnapshot<TValue> {
    readonly open: boolean;
    readonly query: string;
    readonly value: TValue | null;
    readonly selectedOption: SelectOption<TValue> | null;
    readonly filteredGroups: ReadonlyArray<SelectGroup<TValue>>;
    readonly activeIndex: number;
    readonly activeOption: SelectOption<TValue> | null;
    readonly isEmpty: boolean;
    readonly addons: Readonly<SelectBoxAddonSnapshots>;
}

/**
 * Optional context surfaced to every addon hook. Read-only by contract —
 * addons compute new data and return it; they never mutate the snapshot
 * or call mutators on the controller. Hooks run after the base snapshot
 * is built, so `snapshot` already reflects the user-driven state.
 */
export interface AddonHookContext<TValue> {
    readonly snapshot: SelectBoxSnapshot<TValue>;
}

/**
 * Plugin contract. Constructor stores config only; `attach()` is called
 * once at registration with the initial snapshot for any one-time setup;
 * `detach()` is called on controller `destroy()`. Optional hooks are
 * pure transformers — they never receive a mutable controller.
 */
export interface SelectBoxAddon<TValue> {
    readonly name: string;
    attach(initialSnapshot: SelectBoxSnapshot<TValue>): void;
    detach(): void;
    extendSnapshot?(context: AddonHookContext<TValue>): unknown;
}

export interface SingleSelectBoxConfig<TValue> {
    /** Flat options. Leaves with a `group` key are bundled into that group. */
    readonly options?: ReadonlyArray<SelectOption<TValue>>;
    /** Pre-built groups. Combined with `options` if both are supplied. */
    readonly groups?: ReadonlyArray<SelectGroup<TValue>>;
    /** Initial selected value. */
    readonly initialValue?: TValue | null;
    /** Custom filter; defaults to case-insensitive substring match. */
    readonly filter?: OptionFilterStrategy<TValue>;
    /** Label rendered for the synthetic group that holds ungrouped options. */
    readonly ungroupedLabel?: string;
    /** Addons registered before the first snapshot. Equivalent to calling `.use()` in order. */
    readonly addons?: ReadonlyArray<SelectBoxAddon<TValue>>;
}
