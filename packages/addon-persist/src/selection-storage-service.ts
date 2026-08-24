import type { SelectionValue } from "@select-box/core";

/**
 * The slice of the Web Storage API this package needs.
 *
 * Declared here rather than taken from `lib.dom` so a consumer can hand in a
 * test double or a server-side stub without one.
 */
export interface KeyValueStorage {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
}

/**
 * Config for {@link SelectionStorageService}.
 */
export interface SelectionStorageServiceConfig {
    /** Key the selection is stored under. */
    readonly key: string;
    /** Where to store it. Defaults to `"local"`. Ignored when `storage` is given. */
    readonly area?: "local" | "session";
    /** Explicit storage to use, which takes precedence over `area`. */
    readonly storage?: KeyValueStorage;
}

/**
 * Reads and writes one select box's selection as JSON.
 *
 * Every access is guarded: storage throws on quota, and reading it is outright
 * blocked in a private window or by a cookie policy, so a persistence layer that
 * lets those escape takes the whole widget down with it.
 */
export class SelectionStorageService {
    private readonly key: string;
    private readonly storage: KeyValueStorage | null;

    constructor(config: SelectionStorageServiceConfig) {
        this.key = config.key;
        this.storage = config.storage ?? SelectionStorageService.resolve(config.area);
    }

    /**
     * The stored selection.
     *
     * @returns The value, or `null` when nothing is stored or it cannot be read.
     */
    read(): SelectionValue | null {
        if (this.storage === null) return null;
        try {
            const raw = this.storage.getItem(this.key);
            if (raw === null) return null;
            return SelectionStorageService.parse(raw);
        } catch {
            return null;
        }
    }

    /**
     * Stores the selection, or forgets it when empty.
     *
     * @param value - Canonical selection value to store.
     */
    write(value: SelectionValue): void {
        if (this.storage === null) return;
        try {
            if (value === null || (Array.isArray(value) && value.length === 0)) {
                this.storage.removeItem(this.key);
                return;
            }
            this.storage.setItem(this.key, JSON.stringify(value));
        } catch {
            // A full or blocked storage must not take the widget down with it.
        }
    }

    /** Forgets the stored selection. */
    forget(): void {
        if (this.storage === null) return;
        try {
            this.storage.removeItem(this.key);
        } catch {
            // Same reasoning as `write`.
        }
    }

    private static resolve(area: "local" | "session" | undefined): KeyValueStorage | null {
        // Touching `localStorage` is itself what throws under a blocking cookie
        // policy, so even resolving it has to be guarded.
        try {
            if (typeof globalThis === "undefined") return null;
            const host = globalThis as unknown as Record<string, KeyValueStorage | undefined>;
            return (area === "session" ? host["sessionStorage"] : host["localStorage"]) ?? null;
        } catch {
            return null;
        }
    }

    private static parse(raw: string): SelectionValue | null {
        const parsed: unknown = JSON.parse(raw);
        if (typeof parsed === "string") return parsed;
        if (Array.isArray(parsed) && parsed.every((entry) => typeof entry === "string")) {
            return parsed;
        }
        return null;
    }
}
