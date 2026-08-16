import { isMultiSelectionInput } from "../selection-value.js";
import type {
    SelectionDriver,
    SelectionMode,
    SelectionValueInput,
    SelectOptionBase,
} from "../types.js";

/**
 * Multi-selection semantics: an ordered list of option keys. Commit toggles
 * (adds if absent, removes if present). The canonical value shape is
 * `ReadonlyArray<string>`.
 */
export class MultiSelectionDriver implements SelectionDriver<ReadonlyArray<string>> {
    private static readonly EMPTY: ReadonlyArray<string> = Object.freeze([]);

    readonly mode: SelectionMode = "multi";
    readonly closeOnCommit = false;

    empty(): ReadonlyArray<string> {
        return MultiSelectionDriver.EMPTY;
    }

    coerce(input: SelectionValueInput): ReadonlyArray<string> {
        if (input === null || input === undefined) return MultiSelectionDriver.EMPTY;
        if (isMultiSelectionInput(input)) {
            if (input.length === 0) return MultiSelectionDriver.EMPTY;
            return MultiSelectionDriver.dedupe(input.map((entry) => String(entry)));
        }
        return [String(input)];
    }

    commit(current: ReadonlyArray<string>, option: SelectOptionBase): ReadonlyArray<string> {
        const target = option.value;
        if (current.includes(target)) {
            const next = current.filter((value) => value !== target);
            return next.length === 0 ? MultiSelectionDriver.EMPTY : next;
        }
        return [...current, target];
    }

    contains(value: ReadonlyArray<string>, optionValue: string): boolean {
        return value.includes(optionValue);
    }

    keys(value: ReadonlyArray<string>): ReadonlyArray<string> {
        return value;
    }

    private static dedupe(values: ReadonlyArray<string>): ReadonlyArray<string> {
        const seen = new Set<string>();
        const result: string[] = [];
        for (const value of values) {
            if (seen.has(value)) continue;
            seen.add(value);
            result.push(value);
        }
        return result;
    }
}
