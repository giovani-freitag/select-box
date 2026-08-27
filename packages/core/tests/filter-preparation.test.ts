import { describe, expect, test, vi } from "vitest";

import { SingleSelectBoxController, SubstringFilterStrategy } from "../src/index.js";

function optionsOf(count: number): ReadonlyArray<{ value: string; label: string }> {
    return Array.from({ length: count }, (_, index) => ({
        value: String(index),
        label: `Option ${index}`,
    }));
}

const HUGE = 25_000;

describe("preparing a long list off the blocking path", () => {
    test("filters correctly before any slice has run", () => {
        const strategy = new SubstringFilterStrategy();
        const options = optionsOf(HUGE);

        strategy.prepare(options);
        const matches = strategy.filter(options, "option 4242");

        expect(matches.map((option) => option.value)).toEqual(["4242"]);
    });

    test("reaches the same answer once every slice has run", async () => {
        const strategy = new SubstringFilterStrategy();
        const options = optionsOf(HUGE);
        const eager = new SubstringFilterStrategy().filter(options, "option 999");

        strategy.prepare(options);
        await vi.waitFor(() => {
            expect(strategy.filter(options, "option 999").length).toBe(eager.length);
        });

        expect(strategy.filter(options, "option 999").map((option) => option.value)).toEqual(
            eager.map((option) => option.value),
        );
    });

    test("keeps matching accents and case while half-prepared", () => {
        const strategy = new SubstringFilterStrategy();
        const options = [
            ...optionsOf(HUGE),
            { value: "accented", label: "Pêssego" },
        ];

        strategy.prepare(options);
        const matches = strategy.filter(options, "PESSEGO");

        expect(matches.map((option) => option.value)).toEqual(["accented"]);
    });

    test("answers from the new list when the options are replaced mid-flight", () => {
        const strategy = new SubstringFilterStrategy();
        const controller = new SingleSelectBoxController({
            options: optionsOf(HUGE),
            filter: strategy,
        });
        const replacement = [{ value: "only", label: "Only one" }];

        controller.setOptions(replacement);
        const matches = strategy.filter(replacement, "only");

        expect(matches.map((option) => option.value)).toEqual(["only"]);
    });

    test("a short list is ready the moment prepare returns", () => {
        const strategy = new SubstringFilterStrategy();
        const options = optionsOf(50);

        strategy.prepare(options);

        expect(strategy.filter(options, "option 7").map((option) => option.value)).toEqual(["7"]);
    });
});
