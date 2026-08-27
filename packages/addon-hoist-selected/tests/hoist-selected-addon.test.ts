import { MultiSelectBoxController, SingleSelectBoxController } from "@select-box/core";
import type { SelectOption } from "@select-box/core";
import { describe, expect, test } from "vitest";

import { HoistSelectedAddon } from "../src/hoist-selected-addon.js";

const fruits: SelectOption[] = [
    { value: "apple", label: "Apple", group: "Pomes" },
    { value: "pear", label: "Pear", group: "Pomes" },
    { value: "lemon", label: "Lemon", group: "Citrus" },
    { value: "lime", label: "Lime", group: "Citrus" },
];

describe("HoistSelectedAddon", () => {
    test("lifts the selected option into a top-most pinned group labeled 'Selected' by default", () => {
        const controller = new SingleSelectBoxController({
            options: fruits,
            defaultValue: "lemon",
            addons: [new HoistSelectedAddon()],
        });

        const groups = controller.getState().filteredGroups;

        expect(groups[0]?.label).toBe("Selected");
        expect(groups[0]?.options.map((option) => option.label)).toEqual(["Lemon"]);
        const remainingLabels = groups
            .slice(1)
            .flatMap((group) => group.options.map((option) => option.label));
        expect(remainingLabels).not.toContain("Lemon");
    });

    test("groupLabel config flows through to the pinned group header", () => {
        const controller = new SingleSelectBoxController({
            options: fruits,
            defaultValue: "lemon",
            addons: [new HoistSelectedAddon({ groupLabel: "Selecionado" })],
        });

        const groups = controller.getState().filteredGroups;

        expect(groups[0]?.label).toBe("Selecionado");
    });

    test("removes empty groups left behind by the lift", () => {
        const oneCitrus: SelectOption[] = [
            { value: "apple", label: "Apple", group: "Pomes" },
            { value: "lemon", label: "Lemon", group: "Citrus" },
        ];
        const controller = new SingleSelectBoxController({
            options: oneCitrus,
            defaultValue: "lemon",
            addons: [new HoistSelectedAddon()],
        });

        const groupKeys = controller.getState().filteredGroups.map((group) => group.key);

        expect(groupKeys).not.toContain("Citrus");
    });

    test("does nothing when there is no selection", () => {
        const controller = new SingleSelectBoxController({
            options: fruits,
            addons: [new HoistSelectedAddon()],
        });

        const groupKeys = controller.getState().filteredGroups.map((group) => group.key);

        expect(groupKeys).toEqual(["Pomes", "Citrus"]);
    });

    test("does nothing when the selected option is filtered out", () => {
        const controller = new SingleSelectBoxController({
            options: fruits,
            defaultValue: "lemon",
            addons: [new HoistSelectedAddon()],
        });

        controller.setQuery("app");

        const groupKeys = controller.getState().filteredGroups.map((group) => group.key);
        expect(groupKeys).toEqual(["Pomes"]);
    });

    test("when='popoverOpen' suppresses hoist while the popover is closed", () => {
        const controller = new SingleSelectBoxController({
            options: fruits,
            defaultValue: "lemon",
            addons: [new HoistSelectedAddon({ when: "popoverOpen" })],
        });

        const closedKeys = controller.getState().filteredGroups.map((group) => group.key);
        expect(closedKeys[0]).toBe("Pomes");

        controller.open();

        const openKeys = controller.getState().filteredGroups.map((group) => group.key);
        expect(openKeys[0]).toBe("__selected__");
    });

    test("activeIndex resolves against the post-hoist list when the popover opens", () => {
        const controller = new SingleSelectBoxController({
            options: fruits,
            defaultValue: "lime",
            addons: [new HoistSelectedAddon()],
        });

        controller.open();

        expect(controller.getState().activeOption?.label).toBe("Lime");
    });

    test("publishes pinnedKeys via snapshot.addons['hoist-selected']", () => {
        const controller = new SingleSelectBoxController({
            options: fruits,
            defaultValue: "lime",
            addons: [new HoistSelectedAddon({ separator: true })],
        });

        const slice = controller.getState().addons["hoist-selected"];

        expect(slice).toBeDefined();
        expect(slice.pinnedKeys).toEqual(["lime"]);
        expect(slice.separator).toBe(true);
    });

    test("pinnedKeys is empty when nothing was hoisted", () => {
        const controller = new SingleSelectBoxController({
            options: fruits,
            addons: [new HoistSelectedAddon()],
        });

        const slice = controller.getState().addons["hoist-selected"];

        expect(slice?.pinnedKeys).toEqual([]);
    });
});

describe("HoistSelectedAddon in multi mode", () => {
    test("pins every selected option, not just the first", () => {
        const controller = new MultiSelectBoxController({
            options: fruits,
            defaultValue: ["lemon", "apple"],
            addons: [new HoistSelectedAddon()],
        });

        const groups = controller.getState().filteredGroups;

        expect(groups[0]?.key).toBe("__selected__");
        expect(groups[0]?.options.map((option) => option.label)).toEqual([
            "Lemon",
            "Apple",
        ]);
    });

    test("pins in selection order, not in option order", () => {
        const controller = new MultiSelectBoxController({
            options: fruits,
            addons: [new HoistSelectedAddon()],
        });

        controller.commitValue(["lime", "apple"]);

        expect(
            controller.getState().filteredGroups[0]?.options.map((o) => o.value),
        ).toEqual(["lime", "apple"]);
    });

    test("leaves no pinned option behind in its original group", () => {
        const controller = new MultiSelectBoxController({
            options: fruits,
            defaultValue: ["lemon", "apple"],
            addons: [new HoistSelectedAddon()],
        });

        const remaining = controller
            .getState()
            .filteredGroups.slice(1)
            .flatMap((group) => group.options.map((option) => option.value));

        expect(remaining).toEqual(["pear", "lime"]);
    });

    test("pins only the selections that survived the filter", () => {
        const controller = new MultiSelectBoxController({
            options: fruits,
            defaultValue: ["lemon", "apple"],
            addons: [new HoistSelectedAddon()],
        });

        controller.setQuery("lem");

        const groups = controller.getState().filteredGroups;
        expect(groups[0]?.options.map((option) => option.value)).toEqual(["lemon"]);
        expect(
            groups.flatMap((group) => group.options.map((option) => option.value)),
        ).not.toContain("apple");
    });

    test("stands down when the filter hides every selection", () => {
        const controller = new MultiSelectBoxController({
            options: fruits,
            defaultValue: ["lemon", "lime"],
            addons: [new HoistSelectedAddon()],
        });

        controller.setQuery("pea");

        expect(controller.getState().filteredGroups.map((group) => group.key)).toEqual([
            "Pomes",
        ]);
    });

    test("publishes every pinned key in the snapshot slice", () => {
        const controller = new MultiSelectBoxController({
            options: fruits,
            defaultValue: ["lemon", "apple"],
            addons: [new HoistSelectedAddon()],
        });

        expect(controller.getState().addons["hoist-selected"].pinnedKeys).toEqual([
            "lemon",
            "apple",
        ]);
    });

    test("re-pins as the selection grows", () => {
        const controller = new MultiSelectBoxController({
            options: fruits,
            defaultValue: ["apple"],
            addons: [new HoistSelectedAddon()],
        });

        controller.commitOption({ value: "lime", label: "Lime", group: "Citrus" });

        expect(
            controller.getState().filteredGroups[0]?.options.map((o) => o.value),
        ).toEqual(["apple", "lime"]);
    });

    test("drops the pinned group once the last selection is cleared", () => {
        const controller = new MultiSelectBoxController({
            options: fruits,
            defaultValue: ["apple", "lime"],
            addons: [new HoistSelectedAddon()],
        });

        controller.clear();

        expect(controller.getState().filteredGroups.map((group) => group.key)).toEqual([
            "Pomes",
            "Citrus",
        ]);
    });
});
