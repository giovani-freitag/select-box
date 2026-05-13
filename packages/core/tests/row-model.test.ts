import { describe, expect, test } from "vitest";

import { SelectBoxRowModel } from "../src/row-model.js";
import type { SelectGroup } from "../src/types.js";

const groups: ReadonlyArray<SelectGroup> = [
    {
        key: "pomes",
        label: "Pomes",
        options: [
            { value: "apple", label: "Apple" },
            { value: "pear", label: "Pear", disabled: true },
        ],
    },
    {
        key: "__ungrouped__",
        label: "",
        options: [{ value: "lemon", label: "Lemon" }],
    },
];

describe("SelectBoxRowModel", () => {
    test("emits a header row followed by each option in order", () => {
        const model = new SelectBoxRowModel({ groups });

        const summary = model
            .getRows()
            .map((row) => (row.kind === "header" ? `H:${row.group.label}` : `O:${row.option.label}`));

        expect(summary).toEqual(["H:Pomes", "O:Apple", "O:Pear", "O:Lemon"]);
    });

    test("length matches getRows().length", () => {
        const model = new SelectBoxRowModel({ groups });

        expect(model.length).toBe(model.getRows().length);
    });

    test("getRowAt returns undefined for out-of-range indices", () => {
        const model = new SelectBoxRowModel({ groups });

        expect(model.getRowAt(-1)).toBeUndefined();
        expect(model.getRowAt(model.length)).toBeUndefined();
        expect(model.getRowAt(0)).toBeDefined();
    });

    test("skips headers when includeHeaders is false", () => {
        const model = new SelectBoxRowModel({ groups, includeHeaders: false });

        expect(model.getRows().every((row) => row.kind === "option")).toBe(true);
        expect(model.length).toBe(3);
    });

    test("emits empty-label headers when skipEmptyHeaders is false", () => {
        const model = new SelectBoxRowModel({ groups, skipEmptyHeaders: false });

        const headers = model.getRows().filter((row) => row.kind === "header");
        expect(headers).toHaveLength(2);
    });

    test("findRowIndexForActiveIndex skips headers and disabled options", () => {
        const model = new SelectBoxRowModel({ groups });

        // Selectable options: Apple (active 0), Lemon (active 1); Pear is disabled.
        const apple = model.findRowIndexForActiveIndex(0);
        const lemon = model.findRowIndexForActiveIndex(1);

        expect(model.getRowAt(apple)).toMatchObject({ kind: "option", option: { value: "apple" } });
        expect(model.getRowAt(lemon)).toMatchObject({ kind: "option", option: { value: "lemon" } });
    });

    test("findRowIndexForActiveIndex returns -1 when the active index is negative or out of range", () => {
        const model = new SelectBoxRowModel({ groups });

        expect(model.findRowIndexForActiveIndex(-1)).toBe(-1);
        expect(model.findRowIndexForActiveIndex(99)).toBe(-1);
    });
});
