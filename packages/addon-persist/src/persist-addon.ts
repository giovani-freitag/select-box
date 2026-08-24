import {
    AbstractAddon,
    type AddonHookContext,
} from "@select-box/core";

import {
    SelectionStorageService,
    type SelectionStorageServiceConfig,
} from "./selection-storage-service.js";

/**
 * Config for {@link PersistAddon}. Same key and storage the service takes.
 */
export type PersistAddonConfig = SelectionStorageServiceConfig;

/**
 * Public shape published under `snapshot.addons["persist"]`.
 */
export interface PersistSnapshot {
    /** Key the selection is stored under. */
    readonly key: string;
    /** Whether the last write reached storage. `false` means storage is unavailable. */
    readonly stored: boolean;
}

declare module "@select-box/core" {
    interface SelectBoxAddonSnapshots {
        persist: PersistSnapshot;
    }
}

/**
 * Saves the selection to web storage as it changes.
 *
 * Restoring is deliberately not an addon's job: an addon never holds the
 * controller, so it cannot set a value. Read the stored selection with
 * {@link restoreSelection} and pass it as the controller's initial value, which
 * also keeps the restore inside the first snapshot instead of flashing an empty
 * box first.
 */
export class PersistAddon<TExtra extends object = object>
    extends AbstractAddon<TExtra>
{
    readonly name = "persist";

    private readonly service: SelectionStorageService;
    private readonly key: string;
    private lastWritten: string | null = null;

    constructor(config: PersistAddonConfig) {
        super();
        this.key = config.key;
        this.service = new SelectionStorageService(config);
    }

    extendSnapshot(context: AddonHookContext<TExtra>): PersistSnapshot {
        const serialized = JSON.stringify(context.snapshot.value);
        // Every publish reaches here — a keystroke included — so the write is
        // gated on the selection actually having moved.
        if (serialized !== this.lastWritten) {
            this.lastWritten = serialized;
            this.service.write(context.snapshot.value);
        }
        return { key: this.key, stored: this.service.read() !== null };
    }

    override detach(): void {
        this.lastWritten = null;
    }
}

/** Config for {@link restoreSelection}, carrying the mode the value is for. */
export interface RestoreSelectionConfig extends SelectionStorageServiceConfig {
    /** Mode the restored value is going into. Defaults to `"single"`. */
    readonly mode?: "single" | "multi";
}

/**
 * The stored selection for a key, shaped for the controller it is going into.
 *
 * Coerces across a mode change rather than handing back something the
 * controller's `initialValue` rejects: a list restored into single mode keeps
 * its first entry, and a lone value restored into multi mode becomes a
 * singleton.
 *
 * @param config - Same key and storage the addon was given, plus the mode.
 * @returns The stored selection in the requested shape.
 */
export function restoreSelection(
    config: RestoreSelectionConfig & { readonly mode: "multi" },
): ReadonlyArray<string>;
export function restoreSelection(
    config: RestoreSelectionConfig & { readonly mode?: "single" },
): string | null;
export function restoreSelection(
    config: RestoreSelectionConfig,
): string | null | ReadonlyArray<string> {
    const stored = new SelectionStorageService(config).read();
    if (config.mode === "multi") {
        if (stored === null) return [];
        return typeof stored === "string" ? [stored] : stored;
    }
    if (stored === null) return null;
    return typeof stored === "string" ? stored : (stored[0] ?? null);
}
