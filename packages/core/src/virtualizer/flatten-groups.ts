import type { SelectGroup, SelectOption } from "../types.js";

export type SelectBoxRow<TExtra extends object = object> =
    | {
          readonly kind: "header";
          readonly groupIndex: number;
          readonly group: SelectGroup<TExtra>;
      }
    | {
          readonly kind: "option";
          readonly groupIndex: number;
          readonly optionIndex: number;
          readonly group: SelectGroup<TExtra>;
          readonly option: SelectOption<TExtra>;
      };

export interface FlattenGroupsOptions {
    /** When `false`, group headers are omitted. Defaults to `true`. */
    readonly includeHeaders?: boolean;
    /** When `true`, headers without a non-empty `label` are skipped. Defaults to `true`. */
    readonly skipEmptyHeaders?: boolean;
}

/**
 * Walks `filteredGroups` in order and emits one entry per renderable row —
 * group header followed by its options. Wrappers feed the resulting array
 * straight into {@link ListVirtualizer.setRowCount} and use the same array
 * to look up the underlying option/group when rendering a visible row.
 */
export function flattenGroupsForVirtualization<TExtra extends object>(
    groups: ReadonlyArray<SelectGroup<TExtra>>,
    options: FlattenGroupsOptions = {},
): ReadonlyArray<SelectBoxRow<TExtra>> {
    const includeHeaders = options.includeHeaders ?? true;
    const skipEmptyHeaders = options.skipEmptyHeaders ?? true;

    const rows: SelectBoxRow<TExtra>[] = [];
    for (let groupIndex = 0; groupIndex < groups.length; groupIndex += 1) {
        const group = groups[groupIndex]!;
        if (includeHeaders && (!skipEmptyHeaders || group.label !== "")) {
            rows.push({ kind: "header", groupIndex, group });
        }
        for (let optionIndex = 0; optionIndex < group.options.length; optionIndex += 1) {
            rows.push({
                kind: "option",
                groupIndex,
                optionIndex,
                group,
                option: group.options[optionIndex]!,
            });
        }
    }
    return rows;
}
