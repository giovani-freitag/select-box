import { describe, expect, test } from "vitest";

import type { SelectOption } from "@select-box/core";

import { FuzzyFilterStrategy } from "../src/index.js";

const options: ReadonlyArray<SelectOption> = [
    { value: "apple", label: "Apple" },
    { value: "pineapple", label: "Pineapple" },
    { value: "pear", label: "Pear" },
    { value: "grape", label: "Grape" },
    { value: "red-apple", label: "Red Apple" },
];

describe("FuzzyFilterStrategy.filter", () => {
    test("returns every option when the query is empty", () => {
        const strategy = new FuzzyFilterStrategy();

        expect(strategy.filter(options, "")).toEqual(options);
    });

    test("tolerates one typo and still returns the option", () => {
        const strategy = new FuzzyFilterStrategy();

        const labels = strategy.filter(options, "aple").map((option) => option.label);

        expect(labels).toContain("Apple");
    });

    test("drops options that do not pass the (default) threshold", () => {
        const strategy = new FuzzyFilterStrategy();

        const labels = strategy.filter(options, "xyzqq").map((option) => option.label);

        expect(labels).toEqual([]);
    });

    test("stricter threshold rejects matches the default would accept", () => {
        const lax = new FuzzyFilterStrategy({ threshold: 0.6 });
        const strict = new FuzzyFilterStrategy({ threshold: 0.1 });

        const laxCount = lax.filter(options, "aple").length;
        const strictCount = strict.filter(options, "aple").length;

        expect(strictCount).toBeLessThanOrEqual(laxCount);
    });

    test("ranks an exact match above a fuzzy near-match", () => {
        const strategy = new FuzzyFilterStrategy();

        const labels = strategy.filter(options, "apple").map((option) => option.label);

        expect(labels[0]).toBe("Apple");
    });

    test("forwards arbitrary fuse options (isCaseSensitive)", () => {
        const insensitive = new FuzzyFilterStrategy({ threshold: 0.0 });
        const sensitive = new FuzzyFilterStrategy({ threshold: 0.0, isCaseSensitive: true });

        expect(insensitive.filter(options, "APPLE").map((option) => option.label)).toContain("Apple");
        expect(sensitive.filter(options, "APPLE").map((option) => option.label)).not.toContain("Apple");
    });

    test("appends label to user-supplied keys (extra fields stay searchable)", () => {
        interface Extra extends Record<string, unknown> {
            description: string;
        }

        const strategy = new FuzzyFilterStrategy<Extra>({ keys: ["description"], threshold: 0.0 });
        const withDescriptions: ReadonlyArray<SelectOption<Extra>> = [
            { value: "a", label: "Alpha", description: "first letter" },
            { value: "b", label: "Beta", description: "second letter" },
        ];

        const byLabel = strategy.filter(withDescriptions, "alpha").map((option) => option.label);
        const byDescription = strategy.filter(withDescriptions, "second").map((option) => option.label);

        expect(byLabel).toEqual(["Alpha"]);
        expect(byDescription).toEqual(["Beta"]);
    });
});

describe("FuzzyFilterStrategy.match", () => {
    test("returns the matched char ranges in half-open form", () => {
        const strategy = new FuzzyFilterStrategy();

        const ranges = strategy.match("Pineapple", "apple");

        expect(ranges.length).toBeGreaterThan(0);
        for (const range of ranges) {
            expect(range.end).toBeGreaterThan(range.start);
        }
    });

    test("returns an empty array when the label fails fuse's threshold", () => {
        const strategy = new FuzzyFilterStrategy({ threshold: 0.0 });

        expect(strategy.match("Banana", "xyz")).toEqual([]);
    });

    test("returns an empty array for an empty query", () => {
        const strategy = new FuzzyFilterStrategy();

        expect(strategy.match("Apple", "")).toEqual([]);
    });
});
