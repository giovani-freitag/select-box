import { describe, expect, test } from "vitest";

import { SubstringFilterStrategy } from "../src/filters/index.js";
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

    test("matches across diacritics: query without accent finds accented chars", () => {
        const ranges = strategy.match("São Paulo", "sao");

        expect(ranges).toEqual([{ start: 0, end: 3 }]);
    });

    test("matches across diacritics: accented query against plain label", () => {
        const ranges = strategy.match("Sao Paulo", "são");

        expect(ranges).toEqual([{ start: 0, end: 3 }]);
    });

    test("filter() is also diacritic-insensitive", () => {
        const surviving = strategy
            .filter(
                [
                    { value: "sp", label: "São Paulo" },
                    { value: "rj", label: "Rio de Janeiro" },
                ],
                "sao",
            )
            .map((option) => option.label);

        expect(surviving).toEqual(["São Paulo"]);
    });
});

describe("snapshot.highlightRanges (default strategy)", () => {
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
});
