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
 * Selectize-style pinning: the currently selected option is lifted into a
 * synthetic top-most group so it stays visible no matter where it lives in the
 * original ordering. Pure transformer — never mutates the controller.
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
        const target = context.selectedOption;
        if (target === null) return groups;
        if (!this.containsValue(groups, target.value)) return groups;

        const pinnedGroup: SelectGroup<TExtra> = {
            key: SELECTED_GROUP_KEY,
            label: this.groupLabel,
            options: [target],
        };
        const remainingGroups = groups
            .map((group) => ({
                ...group,
                options: group.options.filter((option) => option.value !== target.value),
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

    private containsValue(
        groups: ReadonlyArray<SelectGroup<TExtra>>,
        value: string,
    ): boolean {
        for (const group of groups) {
            for (const option of group.options) {
                if (option.value === value) return true;
            }
        }
        return false;
    }
}
