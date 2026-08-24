import { MultiSelectBoxController, SingleSelectBoxController } from "@select-box/core";
import type { SelectOption } from "@select-box/core";
import { describe, expect, test } from "vitest";

import { RemoveButtonAddon } from "../src/remove-button-addon.js";

const fruits: ReadonlyArray<SelectOption> = [
    { value: "apple", label: "Apple" },
    { value: "pear", label: "Pear" },
];

describe("RemoveButtonAddon", () => {
    test("offers a control per selection, in selection order", () => {
        const controller = new MultiSelectBoxController({
            options: fruits,
            initialValue: ["pear", "apple"],
            addons: [new RemoveButtonAddon()],
        });

        const slice = controller.getState().addons["remove-button"];
        expect(slice.enabled).toBe(true);
        expect(slice.removable.map((entry) => entry.value)).toEqual(["pear", "apple"]);
    });

    test("names each control after the option it removes", () => {
        const controller = new MultiSelectBoxController({
            options: fruits,
            initialValue: ["apple"],
            addons: [new RemoveButtonAddon()],
        });

        expect(
            controller.getState().addons["remove-button"].removable[0]?.ariaLabel,
        ).toBe("Remove Apple");
    });

    test("takes a localized name builder", () => {
        const controller = new MultiSelectBoxController({
            options: fruits,
            initialValue: ["apple"],
            addons: [
                new RemoveButtonAddon({
                    ariaLabel: (label) => `Remover ${label}`,
                    label: "⨯",
                }),
            ],
        });

        const slice = controller.getState().addons["remove-button"];
        expect(slice.removable[0]?.ariaLabel).toBe("Remover Apple");
        expect(slice.label).toBe("⨯");
    });

    test("offers nothing while nothing is selected", () => {
        const controller = new MultiSelectBoxController({
            options: fruits,
            addons: [new RemoveButtonAddon()],
        });

        expect(controller.getState().addons["remove-button"].removable).toEqual([]);
    });

    test("stays out of single mode, where there is no list to prune", () => {
        const controller = new SingleSelectBoxController({
            options: fruits,
            initialValue: "apple",
            addons: [new RemoveButtonAddon()],
        });

        const slice = controller.getState().addons["remove-button"];
        expect(slice.enabled).toBe(false);
        expect(slice.removable).toEqual([]);
    });

    test("comes to single mode when asked to", () => {
        const controller = new SingleSelectBoxController({
            options: fruits,
            initialValue: "apple",
            addons: [new RemoveButtonAddon({ when: "always" })],
        });

        expect(
            controller.getState().addons["remove-button"].removable.map((e) => e.value),
        ).toEqual(["apple"]);
    });

    test("follows a mode flip", () => {
        const controller = new SingleSelectBoxController({
            options: fruits,
            initialValue: "apple",
            addons: [new RemoveButtonAddon()],
        });
        expect(controller.getState().addons["remove-button"].enabled).toBe(false);

        controller.setMode("multi");

        expect(controller.getState().addons["remove-button"].enabled).toBe(true);
    });

    test("offers nothing on a disabled control", () => {
        const controller = new MultiSelectBoxController({
            options: fruits,
            initialValue: ["apple"],
            disabled: true,
            addons: [new RemoveButtonAddon()],
        });

        const slice = controller.getState().addons["remove-button"];
        expect(slice.enabled).toBe(false);
        expect(slice.removable).toEqual([]);
    });

    test("offers nothing on a read-only control", () => {
        const controller = new MultiSelectBoxController({
            options: fruits,
            initialValue: ["apple"],
            readOnly: true,
            addons: [new RemoveButtonAddon()],
        });

        expect(controller.getState().addons["remove-button"].enabled).toBe(false);
    });

    test("the published entry is what a commit removes", () => {
        const controller = new MultiSelectBoxController({
            options: fruits,
            initialValue: ["apple", "pear"],
            addons: [new RemoveButtonAddon()],
        });
        const entry = controller.getState().addons["remove-button"].removable[0]!;

        controller.commitOption(
            fruits.find((option) => option.value === entry.value)!,
        );

        expect(controller.getState().value).toEqual(["pear"]);
    });

    test("shrinks as the selection shrinks", () => {
        const controller = new MultiSelectBoxController({
            options: fruits,
            initialValue: ["apple", "pear"],
            addons: [new RemoveButtonAddon()],
        });

        controller.commitValue(["pear"]);

        expect(
            controller.getState().addons["remove-button"].removable.map((e) => e.value),
        ).toEqual(["pear"]);
    });
});
