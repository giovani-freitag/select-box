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
 * Bundles flat `options` into ordered groups by their `group` key. Leaves
 * without a key fall into a synthetic bucket labelled by `ungroupedLabel`.
 * Every option's `value` is coerced to a string along the way.
 */
export function normalizeOptionsToGroups<TExtra extends object>(input: {
    options: ReadonlyArray<SelectOption<TExtra>>;
    ungroupedLabel: string;
}): ReadonlyArray<SelectGroup<TExtra>> {
    const orderedKeys: string[] = [];
    const buckets = new Map<string, { label: string; options: SelectOption<TExtra>[] }>();

    for (const option of input.options) {
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

    return orderedKeys.map((key) => {
        const bucket = buckets.get(key)!;
        const allDisabled = bucket.options.every((option) => option.disabled === true);
        return {
            key,
            label: bucket.label,
            ...(allDisabled ? { disabled: true } : {}),
            options: bucket.options,
        };
    });
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
