import {
    AbstractAddon,
    type AddonHookContext,
    type AddonTransformContext,
    type SelectGroup,
    type SelectOption,
} from "@select-box/core";

const SYNTHETIC_VALUE_PREFIX = "__create__:";
const DEFAULT_GROUP_KEY = "__create__";

/**
 * Config for {@link CreateOptionAddon}.
 */
export interface CreateOptionAddonConfig<TExtra extends object = object> {
    /**
     * Turns the typed text into the option to select.
     *
     * The addon never mutates the controller, so this is where the consumer adds
     * the new option to whatever list it owns — typically by calling
     * `setOptions` — and returns it. Return `null` to refuse the creation.
     */
    readonly onCreate: (query: string) => SelectOption<TExtra> | null;
    /**
     * Builds the row's label from the typed text. Defaults to
     * `Add "<query>"`. Pass an already-translated builder; the addon stays
     * locale-agnostic.
     */
    readonly label?: (query: string) => string;
    /** Header for the group the row is offered under. Omit to leave it un-headed. */
    readonly groupLabel?: string;
    /**
     * `"whenEmpty"` (default) offers the row only when nothing matched, the way
     * a tag input behaves. `"always"` offers it alongside the matches, for a
     * list where a near-match is still worth creating.
     */
    readonly when?: "whenEmpty" | "always";
    /** Refuses text that is only whitespace. Defaults to `true`. */
    readonly trim?: boolean;
}

/**
 * Public shape published under `snapshot.addons["create-option"]`.
 */
export interface CreateOptionSnapshot {
    /** The text the row would create, or `null` when no row is offered. */
    readonly pendingQuery: string | null;
    /** Value of the synthetic row, so a wrapper can single it out for styling. */
    readonly rowValue: string | null;
}

declare module "@select-box/core" {
    interface SelectBoxAddonSnapshots {
        "create-option": CreateOptionSnapshot;
    }
}

/**
 * Offers a row that turns the typed text into a new option.
 *
 * The row is synthetic: it lives in the filtered list only, never in the option
 * list the controller indexes. Committing it hands the text to `onCreate`, whose
 * returned option is what actually gets committed — which is how the addon adds
 * an option without ever holding the controller.
 */
export class CreateOptionAddon<TExtra extends object = object>
    extends AbstractAddon<TExtra>
{
    readonly name = "create-option";

    private readonly onCreate: (query: string) => SelectOption<TExtra> | null;
    private readonly label: (query: string) => string;
    private readonly groupLabel: string;
    private readonly when: "whenEmpty" | "always";
    private readonly trim: boolean;

    constructor(config: CreateOptionAddonConfig<TExtra>) {
        super();
        this.onCreate = config.onCreate;
        this.label = config.label ?? ((query) => `Add "${query}"`);
        this.groupLabel = config.groupLabel ?? "";
        this.when = config.when ?? "whenEmpty";
        this.trim = config.trim ?? true;
    }

    transformGroups(
        groups: ReadonlyArray<SelectGroup<TExtra>>,
        context: AddonTransformContext<TExtra>,
    ): ReadonlyArray<SelectGroup<TExtra>> {
        const query = this.pendingQuery(groups, context);
        if (query === null) return groups;
        const row: SelectOption<TExtra> = {
            value: CreateOptionAddon.syntheticValue(query),
            label: this.label(query),
        } as SelectOption<TExtra>;
        return [
            ...groups,
            { key: DEFAULT_GROUP_KEY, label: this.groupLabel, options: [row] },
        ];
    }

    interceptCommit(
        option: SelectOption<TExtra>,
        _context: AddonTransformContext<TExtra>,
    ): SelectOption<TExtra> | null {
        const query = CreateOptionAddon.queryOf(option.value);
        if (query === null) return option;
        return this.onCreate(query);
    }

    extendSnapshot(context: AddonHookContext<TExtra>): CreateOptionSnapshot {
        const row = context.snapshot.filteredGroups
            .find((group) => group.key === DEFAULT_GROUP_KEY)
            ?.options[0];
        if (row === undefined) return { pendingQuery: null, rowValue: null };
        return {
            pendingQuery: CreateOptionAddon.queryOf(row.value),
            rowValue: row.value,
        };
    }

    /** The value the synthetic row carries for `query`. */
    static syntheticValue(query: string): string {
        return `${SYNTHETIC_VALUE_PREFIX}${query}`;
    }

    /** The query a synthetic row's value carries, or `null` for a real option. */
    static queryOf(value: string): string | null {
        return value.startsWith(SYNTHETIC_VALUE_PREFIX)
            ? value.slice(SYNTHETIC_VALUE_PREFIX.length)
            : null;
    }

    private pendingQuery(
        groups: ReadonlyArray<SelectGroup<TExtra>>,
        context: AddonTransformContext<TExtra>,
    ): string | null {
        const query = this.trim ? context.query.trim() : context.query;
        if (query === "") return null;
        if (this.when === "always") return query;
        return CreateOptionAddon.hasMatch(groups) ? null : query;
    }

    private static hasMatch(groups: ReadonlyArray<SelectGroup<object>>): boolean {
        return groups.some((group) => group.options.length > 0);
    }
}
