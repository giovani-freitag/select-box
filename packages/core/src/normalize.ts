import type { SelectGroup, SelectOption } from "./types.js";

const UNGROUPED_KEY = "__ungrouped__";

/**
 * Coerces an option to its canonical shape: `value` becomes a string (mirrors
 * `<option value>` semantics in HTML), every other field — including extra
 * domain payload — is preserved as-is.
 */
function coerceOption<TExtra extends object>(option: SelectOption<TExtra>): SelectOption<TExtra> {
    return { ...option, value: String(option.value) } as SelectOption<TExtra>;
}

/**
 * Collapses flat `options` and pre-built `groups` into a single stable ordered
 * group list. All option `value`s are coerced to strings.
 */
export function normalizeOptionsToGroups<TExtra extends object>(input: {
    options?: ReadonlyArray<SelectOption<TExtra>>;
    groups?: ReadonlyArray<SelectGroup<TExtra>>;
    ungroupedLabel: string;
}): ReadonlyArray<SelectGroup<TExtra>> {
    const orderedKeys: string[] = [];
    const buckets = new Map<string, { label: string; disabled?: boolean; options: SelectOption<TExtra>[] }>();

    for (const group of input.groups ?? []) {
        orderedKeys.push(group.key);
        buckets.set(group.key, {
            label: group.label,
            ...(group.disabled !== undefined ? { disabled: group.disabled } : {}),
            options: group.options.map(coerceOption),
        });
    }

    for (const option of input.options ?? []) {
        const coerced = coerceOption(option);
        const key = coerced.group ?? UNGROUPED_KEY;
        const existing = buckets.get(key);
        if (existing) {
            existing.options.push(coerced);
            continue;
        }
        orderedKeys.push(key);
        buckets.set(key, {
            label: key === UNGROUPED_KEY ? input.ungroupedLabel : key,
            options: [coerced],
        });
    }

    const result: SelectGroup<TExtra>[] = [];
    for (const key of orderedKeys) {
        const bucket = buckets.get(key);
        if (!bucket) continue;
        result.push({
            key,
            label: bucket.label,
            ...(bucket.disabled !== undefined ? { disabled: bucket.disabled } : {}),
            options: bucket.options,
        });
    }
    return result;
}

/**
 * Builds a `value → option` index for O(1) lookup. Assumes every option has
 * already been coerced (i.e. `value` is a string).
 */
export function indexOptionsByValue<TExtra extends object>(
    groups: ReadonlyArray<SelectGroup<TExtra>>,
): Map<string, SelectOption<TExtra>> {
    const index = new Map<string, SelectOption<TExtra>>();
    for (const group of groups) {
        for (const option of group.options) {
            index.set(option.value, option);
        }
    }
    return index;
}

export { UNGROUPED_KEY };
