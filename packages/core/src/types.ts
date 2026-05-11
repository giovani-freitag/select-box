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
 * Strategy that filters options against the current query.
 */
export interface OptionFilterStrategy<TValue> {
    filter(
        options: ReadonlyArray<SelectOption<TValue>>,
        query: string,
    ): ReadonlyArray<SelectOption<TValue>>;
}

/**
 * Augmented by addon packages via declaration merging; each addon adds its keyed slice.
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
 * Read-only context passed to every addon hook.
 */
export interface AddonHookContext<TValue> {
    readonly snapshot: SelectBoxSnapshot<TValue>;
}

/**
 * Plugin contract: addons attach at registration, detach on controller destroy, and may
 * publish an extra snapshot slice via `extendSnapshot`.
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
