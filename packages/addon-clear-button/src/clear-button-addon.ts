import {
    AbstractAddon,
    type AddonHookContext,
} from "@select-box/core";

const DEFAULT_LABEL = "×";
const DEFAULT_ARIA_LABEL = "Clear selection";

/**
 * Config for {@link ClearButtonAddon}.
 */
export interface ClearButtonAddonConfig {
    /**
     * Glyph the control renders. Defaults to `"×"`. Pass the already-translated
     * string from your i18n layer; the addon stays locale-agnostic.
     */
    readonly label?: string;
    /** Accessible name for the control. Defaults to `"Clear selection"`. */
    readonly ariaLabel?: string;
    /**
     * `"whenSelected"` (default) offers the control only while something is
     * selected, the way a native clearable input behaves. `"always"` keeps it in
     * the layout so the trigger's width does not jump.
     */
    readonly when?: "whenSelected" | "always";
}

/**
 * Public shape published under `snapshot.addons["clear-button"]`.
 */
export interface ClearButtonSnapshot {
    /** Whether a wrapper should render the control right now. */
    readonly visible: boolean;
    /** Glyph to render. */
    readonly label: string;
    /** Accessible name to put on the control. */
    readonly ariaLabel: string;
}

declare module "@select-box/core" {
    interface SelectBoxAddonSnapshots {
        "clear-button": ClearButtonSnapshot;
    }
}

/**
 * Offers a clear-selection control where the wrapper would not show one.
 *
 * Multi mode already ships a clear-all button next to the chips; this is what
 * brings the same affordance to single mode, and it never appears while the
 * control refuses input — a disabled box that still offers an × is a lie.
 */
export class ClearButtonAddon<TExtra extends object = object>
    extends AbstractAddon<TExtra>
{
    readonly name = "clear-button";

    private readonly label: string;
    private readonly ariaLabel: string;
    private readonly when: "whenSelected" | "always";

    constructor(config: ClearButtonAddonConfig = {}) {
        super();
        this.label = config.label ?? DEFAULT_LABEL;
        this.ariaLabel = config.ariaLabel ?? DEFAULT_ARIA_LABEL;
        this.when = config.when ?? "whenSelected";
    }

    extendSnapshot(context: AddonHookContext<TExtra>): ClearButtonSnapshot {
        const { snapshot } = context;
        const interactive = !snapshot.disabled && !snapshot.readOnly;
        const hasSelection = snapshot.selectedOptions.length > 0;
        return {
            visible: interactive && (this.when === "always" || hasSelection),
            label: this.label,
            ariaLabel: this.ariaLabel,
        };
    }
}
