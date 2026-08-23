import {
    AbstractAddon,
    type AddonHookContext,
    type AddonTransformContext,
    type SelectGroup,
} from "@select-box/core";

const SELECTED_GROUP_KEY = "__selected__";
const DEFAULT_GROUP_LABEL = "Selected";

/**
 * Config for {@link HoistSelectedAddon}.
 */
export interface HoistSelectedAddonConfig {
    /**
     * Label rendered as the header of the synthetic top group. Defaults to
     * `"Selected"`. Pass the already-translated string from your i18n layer
     * (e.g. `t("hoist.selected")`); the addon stays locale-agnostic.
     */
    readonly groupLabel?: string;
    /**
     * When `true`, wrappers reading the snapshot may render a visual divider
     * between the pinned section and the rest. Pure data signal; the addon
     * never renders. Defaults to `false`.
     */
    readonly separator?: boolean;
    /**
     * `"always"` (default) — hoist whenever a selection exists.
     * `"popoverOpen"` — hoist only while the popover is open; closed snapshots
     * show the unmodified group order.
     */
    readonly when?: "always" | "popoverOpen";
}

/**
 * Public shape published under `snapshot.addons["hoist-selected"]`.
 */
export interface HoistSelectedSnapshot {
    /** Values of the options that were lifted to the pinned group, in order. */
    readonly pinnedKeys: ReadonlyArray<string>;
    /** Mirror of `config.separator`; wrappers use it to decide whether to render a divider. */
    readonly separator: boolean;
}

declare module "@select-box/core" {
    interface SelectBoxAddonSnapshots {
        "hoist-selected": HoistSelectedSnapshot;
    }
}

/**
 * Selectize-style pinning: the selected options are lifted into a synthetic
 * top-most group so they stay visible no matter where they live in the original
 * ordering. In multi mode every selected option is pinned, in selection order.
 * Pure transformer — never mutates the controller.
 */
export class HoistSelectedAddon<TExtra extends object = object>
    extends AbstractAddon<TExtra>
{
    readonly name = "hoist-selected";

    private readonly groupLabel: string;
    private readonly separator: boolean;
    private readonly when: "always" | "popoverOpen";

    constructor(config: HoistSelectedAddonConfig = {}) {
        super();
        this.groupLabel = config.groupLabel ?? DEFAULT_GROUP_LABEL;
        this.separator = config.separator ?? false;
        this.when = config.when ?? "always";
    }

    transformGroups(
        groups: ReadonlyArray<SelectGroup<TExtra>>,
        context: AddonTransformContext<TExtra>,
    ): ReadonlyArray<SelectGroup<TExtra>> {
        if (!this.shouldApply(context.open)) return groups;
        // Pin whatever survived the filter, in selection order. Anything the
        // query hid stays hidden: the pinned group is a reordering of the
        // visible list, never a way back in for a filtered-out option.
        const present = this.presentValues(groups);
        const targets = context.selectedOptions.filter((option) =>
            present.has(option.value),
        );
        if (targets.length === 0) return groups;

        const pinnedValues = new Set(targets.map((option) => option.value));
        const pinnedGroup: SelectGroup<TExtra> = {
            key: SELECTED_GROUP_KEY,
            label: this.groupLabel,
            options: targets,
        };
        const remainingGroups = groups
            .map((group) => ({
                ...group,
                options: group.options.filter(
                    (option) => !pinnedValues.has(option.value),
                ),
            }))
            .filter((group) => group.options.length > 0);
        return [pinnedGroup, ...remainingGroups];
    }

    extendSnapshot(context: AddonHookContext<TExtra>): HoistSelectedSnapshot {
        const pinnedGroup = context.snapshot.filteredGroups.find(
            (group) => group.key === SELECTED_GROUP_KEY,
        );
        return {
            pinnedKeys: pinnedGroup
                ? pinnedGroup.options.map((option) => option.value)
                : [],
            separator: this.separator,
        };
    }

    private shouldApply(open: boolean): boolean {
        return this.when === "always" || open;
    }

    private presentValues(
        groups: ReadonlyArray<SelectGroup<TExtra>>,
    ): ReadonlySet<string> {
        const values = new Set<string>();
        for (const group of groups) {
            for (const option of group.options) values.add(option.value);
        }
        return values;
    }
}
