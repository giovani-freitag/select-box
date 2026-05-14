import type { SelectBoxSnapshot, SelectionValue } from "./types.js";

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
