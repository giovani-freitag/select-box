import { describe, expect, test } from "vitest";

import { SubstringFilterStrategy } from "../src/index.js";

function optionsOf(count: number): ReadonlyArray<{ value: string; label: string }> {
    return Array.from({ length: count }, (_, index) => ({
        value: String(index),
        label: `Option ${index}`,
    }));
}

describe("SubstringFilterStrategy over a long list", () => {
    test("returns the same matches whether or not the labels were seen before", () => {
        const strategy = new SubstringFilterStrategy();
        const options = optionsOf(500);

        const first = strategy.filter(options, "option 4");
        const second = strategy.filter(options, "option 4");

        expect(second.map((option) => option.value)).toEqual(first.map((option) => option.value));
    });

    test("keeps matching diacritics case- and accent-insensitively after caching", () => {
        const strategy = new SubstringFilterStrategy();
        const options = [
            { value: "a", label: "Pêssego" },
            { value: "b", label: "Pera" },
        ];

        strategy.filter(options, "p");
        const matches = strategy.filter(options, "pessego");

        expect(matches.map((option) => option.value)).toEqual(["a"]);
    });

    test("notices a replaced option list rather than answering from the old one", () => {
        const strategy = new SubstringFilterStrategy();
        const before = [{ value: "a", label: "Apple" }];
        const after = [{ value: "b", label: "Apricot" }];

        strategy.filter(before, "app");
        const matches = strategy.filter(after, "apr");

        expect(matches.map((option) => option.value)).toEqual(["b"]);
    });

    test("stops re-normalizing a list it has already seen", () => {
        const strategy = new SubstringFilterStrategy();
        const options = optionsOf(20_000);

        strategy.filter(options, "x");
        const started = performance.now();
        strategy.filter(options, "y");
        const cachedRun = performance.now() - started;

        const freshStarted = performance.now();
        new SubstringFilterStrategy().filter(optionsOf(20_000), "y");
        const coldRun = performance.now() - freshStarted;

        expect(cachedRun).toBeLessThan(coldRun);
    });
});
