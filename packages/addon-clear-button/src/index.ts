import type { AddonHookContext, SelectBoxAddon, SelectBoxSnapshot } from "@select-box/core";

export const CLEAR_BUTTON_ADDON_NAME = "clear-button" as const;

export interface ClearButtonAddonConfig {
    /** Glyph or short text rendered inside the button. Defaults to "×". */
    readonly label?: string;
    /** Accessible name announced to assistive tech. Defaults to "Clear selection". */
    readonly ariaLabel?: string;
}

export interface ClearButtonAddonSnapshot {
    readonly visible: boolean;
    readonly label: string;
    readonly ariaLabel: string;
}

declare module "@select-box/core" {
    interface SelectBoxAddonSnapshots {
        readonly [CLEAR_BUTTON_ADDON_NAME]?: ClearButtonAddonSnapshot;
    }
}

/**
 * Publishes a snapshot slice describing when to render a clear affordance; the wrapper owns the click handler.
 */
export class ClearButtonAddon<TValue> implements SelectBoxAddon<TValue> {
    readonly name = CLEAR_BUTTON_ADDON_NAME;
    private readonly label: string;
    private readonly ariaLabel: string;

    constructor(config: ClearButtonAddonConfig = {}) {
        this.label = config.label ?? "×";
        this.ariaLabel = config.ariaLabel ?? "Clear selection";
    }

    attach(_initialSnapshot: SelectBoxSnapshot<TValue>): void {
        // No setup needed — the slice is computed fresh from snapshot.
    }

    detach(): void {
        // No resources to release.
    }

    extendSnapshot(context: AddonHookContext<TValue>): ClearButtonAddonSnapshot {
        return {
            visible: context.snapshot.selectedOption !== null,
            label: this.label,
            ariaLabel: this.ariaLabel,
        };
    }
}
