import { describe, expect, test } from "vitest";

import { FuzzyFilterStrategy, SubstringFilterStrategy } from "../src/filter.js";
import { SingleSelectBoxController } from "../src/controllers/single-select-box-controller.js";

describe("SubstringFilterStrategy.match", () => {
    const strategy = new SubstringFilterStrategy();

    test("returns one range per occurrence of the query inside the label", () => {
        const ranges = strategy.match("Apple pineapple", "apple");

        expect(ranges).toEqual([
            { start: 0, end: 5 },
            { start: 10, end: 15 },
        ]);
    });

    test("is case-insensitive", () => {
        const ranges = strategy.match("APPLE", "app");

        expect(ranges).toEqual([{ start: 0, end: 3 }]);
    });

    test("returns an empty array when the query is empty or trimmed-empty", () => {
        expect(strategy.match("Apple", "")).toEqual([]);
        expect(strategy.match("Apple", "   ")).toEqual([]);
    });

    test("returns an empty array when the query does not appear", () => {
        expect(strategy.match("Apple", "xyz")).toEqual([]);
    });
});

describe("FuzzyFilterStrategy.match", () => {
    const strategy = new FuzzyFilterStrategy();

    test("collapses consecutive matched characters into a single range", () => {
        const ranges = strategy.match("Pineapple", "app");

        expect(ranges).toEqual([{ start: 4, end: 7 }]);
    });

    test("returns one range per scattered match", () => {
        const ranges = strategy.match("a_b_c_d", "abc");

        expect(ranges).toEqual([
            { start: 0, end: 1 },
            { start: 2, end: 3 },
            { start: 4, end: 5 },
        ]);
    });

    test("returns an empty array when the subsequence does not match", () => {
        expect(strategy.match("Apple", "xyz")).toEqual([]);
    });

    test("returns an empty array for an empty query", () => {
        expect(strategy.match("Apple", "")).toEqual([]);
    });
});

describe("snapshot.highlightRanges", () => {
    test("reflects the active filter strategy and the current query", () => {
        const controller = new SingleSelectBoxController({
            options: [
                { value: "apple", label: "Apple" },
                { value: "pineapple", label: "Pineapple" },
            ],
        });

        controller.setQuery("app");
        const snapshot = controller.getState();

        expect(snapshot.highlightRanges("Apple")).toEqual([{ start: 0, end: 3 }]);
        expect(snapshot.highlightRanges("Pineapple")).toEqual([{ start: 4, end: 7 }]);
    });

    test("returns an empty array when the query is empty", () => {
        const controller = new SingleSelectBoxController({
            options: [{ value: "apple", label: "Apple" }],
        });

        const snapshot = controller.getState();

        expect(snapshot.highlightRanges("Apple")).toEqual([]);
    });

    test("delegates to the configured strategy (fuzzy finds matches substring would miss)", () => {
        const controller = new SingleSelectBoxController({
            options: [{ value: "application", label: "Application" }],
            filter: new FuzzyFilterStrategy(),
        });

        controller.setQuery("atn");
        const snapshot = controller.getState();

        expect(snapshot.highlightRanges("Application")).toEqual([
            { start: 0, end: 1 },
            { start: 7, end: 8 },
            { start: 10, end: 11 },
        ]);
    });
});
