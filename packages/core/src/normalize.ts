import type { SelectGroup, SelectOption } from "./types.js";

const UNGROUPED_KEY = "__ungrouped__";

/**
 * Collapses `options` (flat-with-group) and `groups` (already grouped)
 * into a single ordered list of `SelectGroup`s.
 *
 * Order is stable and predictable:
 *   1. pre-built groups in the order received
 *   2. groups synthesised from `options[].group` in first-seen order
 *   3. a trailing synthetic group for options without a `group` key,
 *      keyed by `UNGROUPED_KEY` and labelled with `ungroupedLabel`
 *
 * When `options[].group` matches the key of a pre-built group, the
 * flat options are appended to that group.
 */
export function normalizeOptionsToGroups<TValue>(input: {
    options?: ReadonlyArray<SelectOption<TValue>>;
    groups?: ReadonlyArray<SelectGroup<TValue>>;
    ungroupedLabel: string;
}): ReadonlyArray<SelectGroup<TValue>> {
    const orderedKeys: string[] = [];
    const buckets = new Map<string, { label: string; disabled?: boolean; options: SelectOption<TValue>[] }>();

    for (const group of input.groups ?? []) {
        orderedKeys.push(group.key);
        buckets.set(group.key, {
            label: group.label,
            ...(group.disabled !== undefined ? { disabled: group.disabled } : {}),
            options: [...group.options],
        });
    }

    for (const option of input.options ?? []) {
        const key = option.group ?? UNGROUPED_KEY;
        const existing = buckets.get(key);
        if (existing) {
            existing.options.push(option);
            continue;
        }
        orderedKeys.push(key);
        buckets.set(key, {
            label: key === UNGROUPED_KEY ? input.ungroupedLabel : key,
            options: [option],
        });
    }

    const result: SelectGroup<TValue>[] = [];
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

export { UNGROUPED_KEY };
