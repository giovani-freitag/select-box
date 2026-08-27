import { describe, expect, test } from "vitest";

import { SingleSelectBoxController, SubstringFilterStrategy } from "../src/index.js";

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

describe("preparing a strategy before the first query", () => {
    test("a prepared list costs the filter nothing to normalize", () => {
        const strategy = new SubstringFilterStrategy();
        const options = optionsOf(20_000);

        strategy.prepare(options);
        const preparedStart = performance.now();
        strategy.filter(options, "y");
        const prepared = performance.now() - preparedStart;

        const coldStart = performance.now();
        new SubstringFilterStrategy().filter(optionsOf(20_000), "y");
        const cold = performance.now() - coldStart;

        expect(prepared).toBeLessThan(cold);
    });

    test("the controller prepares the strategy when the options arrive", () => {
        const prepared: number[] = [];
        const strategy = new SubstringFilterStrategy();
        const spy = Object.assign(Object.create(Object.getPrototypeOf(strategy) as object), strategy, {
            prepare(options: ReadonlyArray<{ value: string; label: string }>): void {
                prepared.push(options.length);
            },
        }) as SubstringFilterStrategy;

        new SingleSelectBoxController({ options: optionsOf(3), filter: spy });

        expect(prepared).toEqual([3]);
    });

    test("it prepares again when the option list is replaced", () => {
        const prepared: number[] = [];
        const strategy = new SubstringFilterStrategy();
        const spy = Object.assign(Object.create(Object.getPrototypeOf(strategy) as object), strategy, {
            prepare(options: ReadonlyArray<{ value: string; label: string }>): void {
                prepared.push(options.length);
            },
        }) as SubstringFilterStrategy;
        const controller = new SingleSelectBoxController({ options: optionsOf(3), filter: spy });

        controller.setOptions(optionsOf(7));

        expect(prepared).toEqual([3, 7]);
    });
});
