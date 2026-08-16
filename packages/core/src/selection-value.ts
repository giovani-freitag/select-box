import type { SelectionValue, SelectionValueInput } from "./types.js";

/**
 * Narrows a snapshot value to the multi-mode selection list.
 *
 * @param value - The snapshot value to inspect.
 * @returns `true` when the value holds a multi-mode selection.
 */
export function isMultiSelection(value: SelectionValue): value is ReadonlyArray<string> {
    // `Array.isArray` widens a `ReadonlyArray<string>` union member to `any[]`,
    // leaking `any` into every element read at the call site.
    return Array.isArray(value);
}

/**
 * Narrows a raw selection input to its list form.
 *
 * @param input - The consumer-supplied selection input to inspect.
 * @returns `true` when the input carries a list of option keys.
 */
export function isMultiSelectionInput(
    input: SelectionValueInput,
): input is ReadonlyArray<string | number> {
    return Array.isArray(input);
}
