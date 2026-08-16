import { isMultiSelectionInput } from "../selection-value.js";
import type {
    SelectionDriver,
    SelectionMode,
    SelectionValueInput,
    SelectOptionBase,
} from "../types.js";

/**
 * Single-selection semantics: at most one option at a time. Commit replaces
 * the current value. The canonical value shape is `string | null`.
 */
export class SingleSelectionDriver implements SelectionDriver<string | null> {
    readonly mode: SelectionMode = "single";
    readonly closeOnCommit = true;

    empty(): string | null {
        return null;
    }

    coerce(input: SelectionValueInput): string | null {
        if (isMultiSelectionInput(input)) {
            const first = input[0];
            return first === undefined ? null : String(first);
        }
        if (input === null || input === undefined) return null;
        return String(input);
    }

    commit(_current: string | null, option: SelectOptionBase): string | null {
        return option.value;
    }

    contains(value: string | null, optionValue: string): boolean {
        return value !== null && value === optionValue;
    }

    keys(value: string | null): ReadonlyArray<string> {
        return value === null ? [] : [value];
    }
}
