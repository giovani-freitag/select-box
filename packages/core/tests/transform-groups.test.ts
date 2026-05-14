import { describe, expect, test } from "vitest";

import { SingleSelectBoxController } from "../src/controllers/single-select-box-controller.js";
import type {
    AddonTransformContext,
    SelectBoxAddon,
    SelectGroup,
    SelectOption,
} from "../src/types.js";

const fruits: SelectOption[] = [
    { value: "apple", label: "Apple", group: "Pomes" },
    { value: "pear", label: "Pear", group: "Pomes" },
    { value: "lemon", label: "Lemon", group: "Citrus" },
];

function flatLabels(groups: ReadonlyArray<SelectGroup>): string[] {
    return groups.flatMap((group) => group.options.map((option) => option.label));
}

describe("addon.transformGroups", () => {
    test("addon transform receives the post-filter groups and can reorder", () => {
        const reverseAddon: SelectBoxAddon = {
            name: "reverse",
            transformGroups: (groups) => [...groups].reverse(),
        };

        const controller = new SingleSelectBoxController({
            options: fruits,
            addons: [reverseAddon],
        });

        const labels = controller
            .getState()
            .filteredGroups.map((group) => group.label);
        expect(labels).toEqual(["Citrus", "Pomes"]);
    });

    test("transform context exposes the settled pre-snapshot state", () => {
        let observed: AddonTransformContext | null = null;
        const probeAddon: SelectBoxAddon = {
            name: "probe",
            transformGroups: (groups, context) => {
                observed = context;
                return groups;
            },
        };

        const controller = new SingleSelectBoxController({
            options: fruits,
            initialValue: "pear",
            addons: [probeAddon],
        });
        controller.open();
        controller.setQuery("p");

        expect(observed).not.toBeNull();
        expect(observed!.value).toBe("pear");
        expect(observed!.selectedOption?.label).toBe("Pear");
        expect(observed!.query).toBe("p");
        expect(observed!.open).toBe(true);
    });

    test("transforms compose in registration order", () => {
        const tagAddon = (tag: string): SelectBoxAddon => ({
            name: `tag-${tag}`,
            transformGroups: (groups) =>
                groups.map((group) => ({ ...group, label: `${group.label}/${tag}` })),
        });

        const controller = new SingleSelectBoxController({
            options: fruits,
            addons: [tagAddon("a"), tagAddon("b")],
        });

        const labels = controller
            .getState()
            .filteredGroups.map((group) => group.label);
        expect(labels).toEqual(["Pomes/a/b", "Citrus/a/b"]);
    });

    test("activeIndex is resolved against the transformed list", () => {
        const moveSelectedToTopAddon: SelectBoxAddon = {
            name: "selected-first",
            transformGroups: (groups, context) => {
                if (context.selectedOption === null) return groups;
                const selected = context.selectedOption;
                const remainingOptions: SelectOption[] = [];
                for (const group of groups) {
                    for (const option of group.options) {
                        if (option.value !== selected.value) remainingOptions.push(option);
                    }
                }
                return [
                    { key: "__pinned__", label: "", options: [selected] },
                    ...groups.map((group) => ({
                        ...group,
                        options: group.options.filter(
                            (option) => option.value !== selected.value,
                        ),
                    })).filter((group) => group.options.length > 0),
                ];
            },
        };

        const controller = new SingleSelectBoxController({
            options: fruits,
            initialValue: "lemon",
            addons: [moveSelectedToTopAddon],
        });

        controller.open();

        const flatBefore = flatLabels(controller.getState().filteredGroups);
        expect(flatBefore[0]).toBe("Lemon");
        expect(controller.getState().activeOption?.label).toBe("Lemon");
    });
});
