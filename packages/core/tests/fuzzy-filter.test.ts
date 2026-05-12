import { describe, expect, test } from "vitest";

import { FuzzyFilterStrategy, fuzzyScore } from "../src/filter.js";
import type { SelectOption } from "../src/types.js";

const options: ReadonlyArray<SelectOption> = [
    { value: "apple", label: "Apple" },
    { value: "pineapple", label: "Pineapple" },
    { value: "pear", label: "Pear" },
    { value: "grape", label: "Grape" },
    { value: "red-apple", label: "Red Apple" },
    { value: "candy-apple", label: "Candy Apple" },
];

describe("FuzzyFilterStrategy", () => {
    test("returns every option when the query is empty", () => {
        const strategy = new FuzzyFilterStrategy();

        const result = strategy.filter(options, "");

        expect(result).toEqual(options);
    });

    test("drops options that fail the subsequence check", () => {
        const strategy = new FuzzyFilterStrategy();

        const result = strategy.filter(options, "zzz");

        expect(result).toHaveLength(0);
    });

    test("ranks word-start matches above non-word-start matches", () => {
        const strategy = new FuzzyFilterStrategy();

        const labels = strategy.filter(options, "app").map((option) => option.label);

        expect(labels[0]).toBe("Apple");
        expect(labels.indexOf("Apple")).toBeLessThan(labels.indexOf("Pineapple"));
    });

    test("matches across word boundaries (subsequence allows gaps)", () => {
        const strategy = new FuzzyFilterStrategy();

        const labels = strategy.filter(options, "rdapl").map((option) => option.label);

        expect(labels).toContain("Red Apple");
    });

    test("is case-insensitive", () => {
        const strategy = new FuzzyFilterStrategy();

        const lower = strategy.filter(options, "apple").map((option) => option.label);
        const upper = strategy.filter(options, "APPLE").map((option) => option.label);

        expect(lower).toEqual(upper);
    });

    test("preserves input order between options that tie on score", () => {
        const strategy = new FuzzyFilterStrategy();

        const labels = strategy.filter(options, "apple").map((option) => option.label);

        const redAppleIndex = labels.indexOf("Red Apple");
        const candyAppleIndex = labels.indexOf("Candy Apple");
        expect(redAppleIndex).toBeLessThan(candyAppleIndex);
    });
});

describe("fuzzyScore", () => {
    test("returns null when the query has unmatched characters", () => {
        expect(fuzzyScore("xyz", "apple")).toBeNull();
    });

    test("returns 0 for an empty query", () => {
        expect(fuzzyScore("", "apple")).toBe(0);
    });

    test("scores a prefix match higher than the same query deep in the string", () => {
        const prefix = fuzzyScore("app", "apple");
        const suffix = fuzzyScore("app", "pineapple");

        expect(prefix).not.toBeNull();
        expect(suffix).not.toBeNull();
        expect(prefix!).toBeGreaterThan(suffix!);
    });

    test("rewards consecutive matches over scattered ones", () => {
        const consecutive = fuzzyScore("abc", "abcdef");
        const scattered = fuzzyScore("abc", "a_b_c_d");

        expect(consecutive).not.toBeNull();
        expect(scattered).not.toBeNull();
        expect(consecutive!).toBeGreaterThan(scattered!);
    });

    test("treats space, hyphen, underscore, slash, and dot as word boundaries", () => {
        const boundaries = ["red apple", "red-apple", "red_apple", "red/apple", "red.apple"];

        for (const haystack of boundaries) {
            expect(fuzzyScore("a", haystack)).not.toBeNull();
            const wordStart = fuzzyScore("a", haystack)!;
            const continuation = fuzzyScore("e", haystack)!;
            expect(wordStart).toBeGreaterThan(continuation);
        }
    });
});
