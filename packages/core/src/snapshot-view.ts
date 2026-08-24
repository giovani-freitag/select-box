import type { SelectBoxSnapshot, SelectionValue } from "./types.js";

/** What a wrapper needs to render the clear-selection control. */
export interface ClearControlView {
    readonly visible: boolean;
    readonly label: string;
    readonly ariaLabel: string;
}

/** What a wrapper needs to render a per-selection remove control. */
export interface RemoveControlView {
    readonly enabled: boolean;
    readonly label: string;
    /** Accessible name for the control that removes the option with this label. */
    readonly ariaLabelFor: (optionLabel: string) => string;
}

const NULL_KEY = "\x00null";
const ARRAY_SEP = "\x00";

/**
 * Read-only view over a `SelectBoxSnapshot` that exposes the derived data
 * every wrapper needs while rendering — selection checks, the canonical
 * trigger-input text, the value's change-detection key. Construct one per
 * render (or per snapshot), keep the same view across the option loop.
 *
 * The class is mode-agnostic: every method works for both single- and
 * multi-select snapshots, branching internally so wrappers never have to.
 */
export class SelectBoxSnapshotView<
    TExtra extends object = object,
    TValue extends SelectionValue = SelectionValue,
> {
    private readonly snapshot: SelectBoxSnapshot<TExtra, TValue>;

    constructor(snapshot: SelectBoxSnapshot<TExtra, TValue>) {
        this.snapshot = snapshot;
    }

    /**
     * Whether `optionValue` participates in the current selection.
     * Single mode: equality with the held key. Multi mode: array membership.
     */
    isSelected(optionValue: string): boolean {
        const value = this.snapshot.value;
        if (Array.isArray(value)) return value.includes(optionValue);
        return value !== null && value === optionValue;
    }

    /**
     * Canonical string for the trigger `<input>`:
     *
     * - **Single, closed**: the selected option's `label`, or `""`.
     * - **Single, open**: the live `query` (user is filtering).
     * - **Multi (any state)**: always the live `query` — selections are
     *   surfaced as chips outside the input.
     */
    get triggerInputValue(): string {
        const snapshot = this.snapshot;
        if (snapshot.mode === "multi") return snapshot.query;
        if (snapshot.open) return snapshot.query;
        return snapshot.selectedOption?.label ?? "";
    }

    /**
     * How a wrapper should render the clear-selection control.
     *
     * Multi mode ships one natively next to the chips. The
     * `clear-button` addon is what brings it to single mode and what carries a
     * translated glyph and name, so its slice — when installed — wins over the
     * built-in rule. Core honours the slice by name; that name is the contract
     * between the addon and every wrapper.
     */
    get clearControl(): ClearControlView {
        const slice = this.addonSlice("clear-button");
        const label = typeof slice?.["label"] === "string" ? slice["label"] : "×";
        const ariaLabel =
            typeof slice?.["ariaLabel"] === "string" ? slice["ariaLabel"] : "Clear all";
        const visible =
            typeof slice?.["visible"] === "boolean"
                ? slice["visible"]
                : this.snapshot.mode === "multi" && this.snapshot.selectedOptions.length > 0;
        return { visible, label, ariaLabel };
    }

    /**
     * How a wrapper should render the per-selection remove control.
     *
     * The chip's own × ships natively; the `remove-button` addon is what
     * translates it and what can take it away on a control that refuses input.
     */
    get removeControl(): RemoveControlView {
        const slice = this.addonSlice("remove-button");
        const label = typeof slice?.["label"] === "string" ? slice["label"] : "×";
        const enabled = typeof slice?.["enabled"] === "boolean" ? slice["enabled"] : true;
        const named = SelectBoxSnapshotView.readRemovableNames(slice);
        return {
            enabled,
            label,
            ariaLabelFor: (optionLabel: string) =>
                named.get(optionLabel) ?? `Remove ${optionLabel}`,
        };
    }

    private addonSlice(name: string): Record<string, unknown> | null {
        const slice = (this.snapshot.addons as Record<string, unknown>)[name];
        return typeof slice === "object" && slice !== null
            ? (slice as Record<string, unknown>)
            : null;
    }

    private static readRemovableNames(
        slice: Record<string, unknown> | null,
    ): ReadonlyMap<string, string> {
        const entries = new Map<string, string>();
        const removable = slice?.["removable"];
        if (!Array.isArray(removable)) return entries;
        for (const entry of removable) {
            if (typeof entry !== "object" || entry === null) continue;
            const row = entry as Record<string, unknown>;
            if (typeof row["label"] === "string" && typeof row["ariaLabel"] === "string") {
                entries.set(row["label"], row["ariaLabel"]);
            }
        }
        return entries;
    }

    /**
     * Stable string key derived from the current `value`. Two snapshots with
     * identical selection contents produce identical keys, regardless of
     * array identity — wrappers compare against a stored previous key to fire
     * `onChange` only on real changes.
     */
    get valueKey(): string {
        return SelectBoxSnapshotView.valueKey(this.snapshot.value);
    }

    /**
     * Same as the `valueKey` getter, but available without holding a full
     * snapshot. Useful when comparing a stored previous value to a new one
     * (the typical change-detection flow in wrapper code).
     */
    static valueKey(value: SelectionValue): string {
        if (value === null) return NULL_KEY;
        if (Array.isArray(value)) return value.join(ARRAY_SEP);
        return value as string;
    }
}
