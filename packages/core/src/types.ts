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

/**
 * Strategy that filters options against the current query.
 */
export interface OptionFilterStrategy<TExtra extends object = object> {
    filter(
        options: ReadonlyArray<SelectOption<TExtra>>,
        query: string,
    ): ReadonlyArray<SelectOption<TExtra>>;
}

/**
 * Augmented by addon packages via declaration merging; each addon adds its keyed slice.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface SelectBoxAddonSnapshots {}

export interface SelectBoxSnapshot<TExtra extends object = object> {
    readonly open: boolean;
    readonly query: string;
    readonly value: string | null;
    readonly selectedOption: SelectOption<TExtra> | null;
    readonly filteredGroups: ReadonlyArray<SelectGroup<TExtra>>;
    readonly activeIndex: number;
    readonly activeOption: SelectOption<TExtra> | null;
    readonly isEmpty: boolean;
    readonly addons: Readonly<SelectBoxAddonSnapshots>;
}

/**
 * Read-only context passed to every addon hook.
 */
export interface AddonHookContext<TExtra extends object = object> {
    readonly snapshot: SelectBoxSnapshot<TExtra>;
}

/**
 * Plugin contract: addons attach at registration, detach on controller destroy, and may
 * publish an extra snapshot slice via `extendSnapshot`.
 */
export interface SelectBoxAddon<TExtra extends object = object> {
    readonly name: string;
    attach(initialSnapshot: SelectBoxSnapshot<TExtra>): void;
    detach(): void;
    extendSnapshot?(context: AddonHookContext<TExtra>): unknown;
}

export interface SingleSelectBoxConfig<TExtra extends object = object> {
    /** Flat options. Leaves with a `group` key are bundled into that group. */
    readonly options?: ReadonlyArray<SelectOption<TExtra>>;
    /** Pre-built groups. Combined with `options` if both are supplied. */
    readonly groups?: ReadonlyArray<SelectGroup<TExtra>>;
    /** Initial selected value (coerced to string). */
    readonly initialValue?: string | number | null;
    /** Custom filter; defaults to case-insensitive substring match. */
    readonly filter?: OptionFilterStrategy<TExtra>;
    /** Label rendered for the synthetic group that holds ungrouped options. */
    readonly ungroupedLabel?: string;
    /** Addons registered before the first snapshot. Equivalent to calling `.use()` in order. */
    readonly addons?: ReadonlyArray<SelectBoxAddon<TExtra>>;
}
