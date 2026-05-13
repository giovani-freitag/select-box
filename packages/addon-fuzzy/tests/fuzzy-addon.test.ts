import { SingleSelectBoxController, SubstringFilterStrategy } from "@select-box/core";
import { describe, expect, test } from "vitest";

import { FuzzyAddon } from "../src/fuzzy-addon.js";
import { FuzzyFilterStrategy } from "../src/fuzzy-filter-strategy.js";

const fruits = [
    { value: "apple", label: "Apple" },
    { value: "banana", label: "Banana" },
];

describe("FuzzyAddon", () => {
    test("provides FuzzyFilterStrategy when no explicit filter is set", () => {
        const controller = new SingleSelectBoxController({ options: fruits });

        controller.use(new FuzzyAddon());

        expect(controller.getFilter()).toBeInstanceOf(FuzzyFilterStrategy);
    });

    test("explicit config.filter overrides the addon's provider", () => {
        const explicit = new SubstringFilterStrategy();
        const controller = new SingleSelectBoxController({
            options: fruits,
            filter: explicit,
            addons: [new FuzzyAddon()],
        });

        expect(controller.getFilter()).toBe(explicit);
    });

    test("config flows through to the underlying strategy", () => {
        const controller = new SingleSelectBoxController({
            options: fruits,
            addons: [new FuzzyAddon({ threshold: 0.0 })],
        });

        controller.setQuery("xyz");

        expect(controller.getState().isEmpty).toBe(true);
    });
});
