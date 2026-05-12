export type FormStateValue = File | string | FormData | null;

/**
 * Encodes a controller value into the string FormData round-trips.
 */
export function encodeFormValue(value: unknown): string {
    if (value === null || value === undefined) return "";
    if (typeof value === "string") return value;
    return JSON.stringify(value);
}

/**
 * Restores a value previously encoded by `encodeFormValue`.
 */
export function parseFormState<TValue>(state: FormStateValue): TValue | null {
    if (state === null || state === "") return null;
    if (typeof state !== "string") return null;
    try {
        return JSON.parse(state) as TValue;
    } catch {
        return state as unknown as TValue;
    }
}
