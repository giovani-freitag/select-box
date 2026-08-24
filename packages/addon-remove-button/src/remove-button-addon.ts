import {
    AbstractAddon,
    type AddonHookContext,
} from "@select-box/core";

const DEFAULT_LABEL = "×";

/**
 * Config for {@link RemoveButtonAddon}.
 */
export interface RemoveButtonAddonConfig {
    /** Glyph the control renders. Defaults to `"×"`. */
    readonly label?: string;
    /**
     * Builds the accessible name from the option's label. Defaults to
     * `Remove <label>`. Pass an already-translated builder; the addon stays
     * locale-agnostic.
     */
    readonly ariaLabel?: (optionLabel: string) => string;
    /**
     * `"multi"` (default) offers the control only in multi mode, where a
     * selection is a list to prune. `"always"` offers it in single mode too.
     */
    readonly when?: "multi" | "always";
}

/** One removable entry, in selection order. */
export interface RemovableSelection {
    readonly value: string;
    readonly label: string;
    readonly ariaLabel: string;
}

/**
 * Public shape published under `snapshot.addons["remove-button"]`.
 */
export interface RemoveButtonSnapshot {
    /** Whether a wrapper should render remove controls right now. */
    readonly enabled: boolean;
    /** Glyph to render on each control. */
    readonly label: string;
    /** Every selection a control can be rendered for, in selection order. */
    readonly removable: ReadonlyArray<RemovableSelection>;
}

declare module "@select-box/core" {
    interface SelectBoxAddonSnapshots {
        "remove-button": RemoveButtonSnapshot;
    }
}

/**
 * Offers a per-selection remove control.
 *
 * Publishes the accessible name for each entry rather than leaving every wrapper
 * to invent one, which is what keeps the five announcing the same thing. Removal
 * itself is a plain commit: in multi mode committing a selected option toggles
 * it off.
 */
export class RemoveButtonAddon<TExtra extends object = object>
    extends AbstractAddon<TExtra>
{
    readonly name = "remove-button";

    private readonly label: string;
    private readonly ariaLabel: (optionLabel: string) => string;
    private readonly when: "multi" | "always";

    constructor(config: RemoveButtonAddonConfig = {}) {
        super();
        this.label = config.label ?? DEFAULT_LABEL;
        this.ariaLabel = config.ariaLabel ?? ((optionLabel) => `Remove ${optionLabel}`);
        this.when = config.when ?? "multi";
    }

    extendSnapshot(context: AddonHookContext<TExtra>): RemoveButtonSnapshot {
        const { snapshot } = context;
        const interactive = !snapshot.disabled && !snapshot.readOnly;
        const modeAllows = this.when === "always" || snapshot.mode === "multi";
        const enabled = interactive && modeAllows;
        return {
            enabled,
            label: this.label,
            removable: enabled
                ? snapshot.selectedOptions.map((option) => ({
                      value: option.value,
                      label: option.label,
                      ariaLabel: this.ariaLabel(option.label),
                  }))
                : [],
        };
    }
}
