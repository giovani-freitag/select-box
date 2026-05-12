import { SingleSelectBoxController, SubstringFilterStrategy } from "@select-box/core";
import { describe, expect, test } from "vitest";

import { FuzzyAddon } from "../src/fuzzy-addon.js";
import { FuzzyFilterStrategy } from "../src/fuzzy-filter-strategy.js";

const fruits = [
    { value: "apple", label: "Apple" },
    { value: "banana", label: "Banana" },
];

describe("FuzzyAddon", () => {
    test("attach swaps the controller's filter for FuzzyFilterStrategy", () => {
        const controller = new SingleSelectBoxController({ options: fruits });

        controller.use(new FuzzyAddon());

        expect(controller.getFilter()).toBeInstanceOf(FuzzyFilterStrategy);
    });

    test("detach restores whatever filter was active at attach time", () => {
        const original = new SubstringFilterStrategy();
        const controller = new SingleSelectBoxController({ options: fruits, filter: original });

        controller.use(new FuzzyAddon());
        expect(controller.getFilter()).toBeInstanceOf(FuzzyFilterStrategy);

        controller.destroy();

        expect(controller.getFilter()).toBe(original);
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
