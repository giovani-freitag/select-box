import { describe, expect, test } from "vitest";

import { indexOptionsByValue, normalizeOptionsToGroups } from "../src/normalize.js";
import type { SelectGroup, SelectOption } from "../src/types.js";

describe("normalizeOptionsToGroups", () => {
    test("empty input produces an empty group list", () => {
        const groups = normalizeOptionsToGroups({ options: [], ungroupedLabel: "Other" });

        expect(groups).toEqual([]);
    });

    test("flat options without a group key collapse into a single synthetic bucket", () => {
        const groups = normalizeOptionsToGroups({
            options: [
                { value: "a", label: "Apple" },
                { value: "b", label: "Banana" },
            ],
            ungroupedLabel: "Citrus",
        });

        expect(groups).toHaveLength(1);
        expect(groups[0]?.label).toBe("Citrus");
        expect(groups[0]?.options.map((option) => option.label)).toEqual(["Apple", "Banana"]);
    });

    test("the synthetic bucket has an empty label by default — matches native <select> without <optgroup>", () => {
        const groups = normalizeOptionsToGroups({
            options: [{ value: "a", label: "Apple" }],
            ungroupedLabel: "",
        });

        expect(groups[0]?.label).toBe("");
    });

    test("options with the same group key bundle into a single group", () => {
        const groups = normalizeOptionsToGroups({
            options: [
                { value: "apple", label: "Apple", group: "Pomes" },
                { value: "pear", label: "Pear", group: "Pomes" },
                { value: "peach", label: "Peach", group: "Stone" },
            ],
            ungroupedLabel: "",
        });

        expect(groups.map((group) => group.label)).toEqual(["Pomes", "Stone"]);
        expect(groups[0]?.options).toHaveLength(2);
    });

    test("bucket order follows the first occurrence of each group key, not alphabetical", () => {
        const groups = normalizeOptionsToGroups({
            options: [
                { value: "lemon", label: "Lemon", group: "Citrus" },
                { value: "apple", label: "Apple", group: "Pomes" },
                { value: "lime", label: "Lime", group: "Citrus" },
            ],
            ungroupedLabel: "",
        });

        expect(groups.map((group) => group.key)).toEqual(["Citrus", "Pomes"]);
    });

    test("ungrouped options interleave-by-first-appearance: their bucket lands where the first ungrouped option appears", () => {
        const groups = normalizeOptionsToGroups({
            options: [
                { value: "apple", label: "Apple", group: "Pomes" },
                { value: "lemon", label: "Lemon" },
                { value: "pear", label: "Pear", group: "Pomes" },
            ],
            ungroupedLabel: "Other",
        });

        expect(groups.map((group) => group.label)).toEqual(["Pomes", "Other"]);
        expect(groups[0]?.options).toHaveLength(2);
        expect(groups[1]?.options[0]?.label).toBe("Lemon");
    });

    test("numeric values are coerced to strings (mirrors <option value> semantics)", () => {
        const groups = normalizeOptionsToGroups({
            options: [
                { value: 1 as unknown as string, label: "One" },
                { value: 2 as unknown as string, label: "Two" },
            ],
            ungroupedLabel: "",
        });

        const values = groups.flatMap((group) => group.options.map((option) => option.value));
        expect(values).toEqual(["1", "2"]);
        expect(values.every((value) => typeof value === "string")).toBe(true);
    });

    test("a group whose every option is disabled gets `disabled: true` on the group itself", () => {
        const groups = normalizeOptionsToGroups({
            options: [
                { value: "plum", label: "Plum", group: "Out of season", disabled: true },
                { value: "cherry", label: "Cherry", group: "Out of season", disabled: true },
                { value: "apple", label: "Apple", group: "In stock" },
            ],
            ungroupedLabel: "",
        });

        expect(groups[0]?.disabled).toBe(true);
        expect(groups[1]?.disabled).toBeUndefined();
    });

    test("extra payload on options survives normalization untouched", () => {
        interface Extra { readonly id: number; readonly tag: string; }
        const groups = normalizeOptionsToGroups<Extra>({
            options: [
                { value: "a", label: "Apple", id: 1, tag: "fruit" },
            ],
            ungroupedLabel: "",
        });

        const option = groups[0]?.options[0];
        expect(option?.id).toBe(1);
        expect(option?.tag).toBe("fruit");
    });
});

describe("indexOptionsByValue", () => {
    test("builds a value → option Map for O(1) lookup across all groups", () => {
        const groups: ReadonlyArray<SelectGroup> = [
            {
                key: "Pomes",
                label: "Pomes",
                options: [
                    { value: "apple", label: "Apple" },
                    { value: "pear", label: "Pear" },
                ],
            },
            {
                key: "Stone",
                label: "Stone",
                options: [{ value: "peach", label: "Peach" }],
            },
        ];

        const index = indexOptionsByValue(groups);

        expect(index.size).toBe(3);
        expect(index.get("apple")?.label).toBe("Apple");
        expect(index.get("peach")?.label).toBe("Peach");
        expect(index.get("missing")).toBeUndefined();
    });

    test("later duplicate values overwrite earlier entries (last writer wins)", () => {
        const groups: ReadonlyArray<SelectGroup> = [
            {
                key: "A",
                label: "A",
                options: [{ value: "dup", label: "First" }],
            },
            {
                key: "B",
                label: "B",
                options: [{ value: "dup", label: "Second" }],
            },
        ];

        const index = indexOptionsByValue(groups);

        expect(index.get("dup")?.label).toBe("Second");
    });

    test("returns an empty map when given no groups", () => {
        const index = indexOptionsByValue<SelectOption>([]);

        expect(index.size).toBe(0);
    });
});
