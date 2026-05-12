import type { SelectGroup, SelectOption } from "./types.js";

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

export interface SelectBoxRowModelOptions {
    /** When `false`, group headers are omitted from the row sequence. Defaults to `true`. */
    readonly includeHeaders?: boolean;
    /** When `true`, headers without a non-empty `label` are skipped. Defaults to `true`. */
    readonly skipEmptyHeaders?: boolean;
}

/** Flat positional view of `filteredGroups` — headers and options as numbered rows. */
export class SelectBoxRowModel<TExtra extends object = object> {
    private readonly rows: ReadonlyArray<SelectBoxRow<TExtra>>;

    constructor(
        groups: ReadonlyArray<SelectGroup<TExtra>>,
        options: SelectBoxRowModelOptions = {},
    ) {
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
        this.rows = rows;
    }

    get length(): number {
        return this.rows.length;
    }

    getRows(): ReadonlyArray<SelectBoxRow<TExtra>> {
        return this.rows;
    }

    getRowAt(index: number): SelectBoxRow<TExtra> | undefined {
        return this.rows[index];
    }

    /**
     * Row index of the selectable option at position `activeIndex`, or `-1`
     * when nothing matches. The snapshot's `activeIndex` counts across
     * selectable options only, while row indices count headers too.
     */
    findRowIndexForActiveIndex(activeIndex: number): number {
        if (activeIndex < 0) return -1;
        let selectableSeen = -1;
        for (let rowIndex = 0; rowIndex < this.rows.length; rowIndex += 1) {
            const row = this.rows[rowIndex]!;
            if (row.kind !== "option") continue;
            if (row.group.disabled || row.option.disabled) continue;
            selectableSeen += 1;
            if (selectableSeen === activeIndex) return rowIndex;
        }
        return -1;
    }
}
