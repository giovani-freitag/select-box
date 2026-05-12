import { describe, expect, test } from "vitest";

import { AbstractFilterStrategy } from "../src/filters/index.js";
import { SingleSelectBoxController } from "../src/controllers/single-select-box-controller.js";
import type { SearchMatchRange, SelectOption } from "../src/types.js";

const options = [
    { value: "apple", label: "Apple" },
    { value: "banana", label: "Banana" },
    { value: "cherry", label: "Cherry" },
];

class StartsWithFilterStrategy extends AbstractFilterStrategy {
    override filter(allOptions: ReadonlyArray<SelectOption>, query: string) {
        const needle = query.trim().toLowerCase();
        if (needle === "") return allOptions;
        return allOptions.filter((option) => option.label.toLowerCase().startsWith(needle));
    }

    override match(label: string, query: string): ReadonlyArray<SearchMatchRange> {
        const needle = query.trim().toLowerCase();
        if (needle === "" || !label.toLowerCase().startsWith(needle)) return [];
        return [{ start: 0, end: needle.length }];
    }
}

describe("AbstractFilterStrategy", () => {
    test("works as a drop-in filter when passed to the controller", () => {
        const controller = new SingleSelectBoxController({
            options,
            filter: new StartsWithFilterStrategy(),
        });
        controller.setQuery("b");

        const labels = controller
            .getState()
            .filteredGroups.flatMap((group) => group.options.map((option) => option.label));

        expect(labels).toEqual(["Banana"]);
    });

    test("subclass match drives snapshot.highlightRanges", () => {
        const controller = new SingleSelectBoxController({
            options,
            filter: new StartsWithFilterStrategy(),
        });
        controller.setQuery("ban");

        expect(controller.getState().highlightRanges("Banana")).toEqual([{ start: 0, end: 3 }]);
        expect(controller.getState().highlightRanges("Apple")).toEqual([]);
    });
});
