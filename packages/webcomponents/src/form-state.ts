export type FormStateValue = File | string | FormData | null;

/**
 * Encodes a controller value (always a string or `null`) for FormData round-trip.
 */
export function encodeFormValue(value: string | null): string {
    return value ?? "";
}

/**
 * Restores a string value previously written via `encodeFormValue`.
 */
export function parseFormState(state: FormStateValue): string | null {
    if (state === null || state === "") return null;
    if (typeof state !== "string") return null;
    return state;
}
