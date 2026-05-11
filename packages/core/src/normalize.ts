import type { SelectGroup, SelectOption } from "./types.js";

const UNGROUPED_KEY = "__ungrouped__";

/**
 * Collapses flat `options` and pre-built `groups` into a single stable ordered group list.
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
