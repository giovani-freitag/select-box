import { MultiSelectBoxController, SingleSelectBoxController } from "@select-box/core";
import type { SelectOption } from "@select-box/core";
import { describe, expect, test } from "vitest";

import { ClearButtonAddon } from "../src/clear-button-addon.js";

const fruits: ReadonlyArray<SelectOption> = [
    { value: "apple", label: "Apple" },
    { value: "pear", label: "Pear" },
];

describe("ClearButtonAddon", () => {
    test("stays out of the way while nothing is selected", () => {
        const controller = new SingleSelectBoxController({
            options: fruits,
            addons: [new ClearButtonAddon()],
        });

        expect(controller.getState().addons["clear-button"].visible).toBe(false);
    });

    test("offers itself once something is selected", () => {
        const controller = new SingleSelectBoxController({
            options: fruits,
            defaultValue: "apple",
            addons: [new ClearButtonAddon()],
        });

        expect(controller.getState().addons["clear-button"].visible).toBe(true);
    });

    test("follows the selection as it comes and goes", () => {
        const controller = new SingleSelectBoxController({
            options: fruits,
            addons: [new ClearButtonAddon()],
        });

        controller.commitValue("pear");
        expect(controller.getState().addons["clear-button"].visible).toBe(true);

        controller.clear();
        expect(controller.getState().addons["clear-button"].visible).toBe(false);
    });

    test("holds its place when asked to stay always", () => {
        const controller = new SingleSelectBoxController({
            options: fruits,
            addons: [new ClearButtonAddon({ when: "always" })],
        });

        expect(controller.getState().addons["clear-button"].visible).toBe(true);
    });

    test("hides on a disabled control, which cannot be cleared anyway", () => {
        const controller = new SingleSelectBoxController({
            options: fruits,
            defaultValue: "apple",
            disabled: true,
            addons: [new ClearButtonAddon({ when: "always" })],
        });

        expect(controller.getState().addons["clear-button"].visible).toBe(false);
    });

    test("hides on a read-only control for the same reason", () => {
        const controller = new SingleSelectBoxController({
            options: fruits,
            defaultValue: "apple",
            readOnly: true,
            addons: [new ClearButtonAddon()],
        });

        expect(controller.getState().addons["clear-button"].visible).toBe(false);
    });

    test("comes back when the control becomes interactive again", () => {
        const controller = new SingleSelectBoxController({
            options: fruits,
            defaultValue: "apple",
            disabled: true,
            addons: [new ClearButtonAddon()],
        });

        controller.setInteractivity({ disabled: false, readOnly: false });

        expect(controller.getState().addons["clear-button"].visible).toBe(true);
    });

    test("carries the glyph and the accessible name a wrapper renders", () => {
        const controller = new SingleSelectBoxController({
            options: fruits,
            defaultValue: "apple",
            addons: [new ClearButtonAddon({ label: "⨯", ariaLabel: "Limpar" })],
        });

        const slice = controller.getState().addons["clear-button"];
        expect(slice.label).toBe("⨯");
        expect(slice.ariaLabel).toBe("Limpar");
    });

    test("defaults to a multiplication sign and an English name", () => {
        const controller = new SingleSelectBoxController({
            options: fruits,
            addons: [new ClearButtonAddon()],
        });

        const slice = controller.getState().addons["clear-button"];
        expect(slice.label).toBe("×");
        expect(slice.ariaLabel).toBe("Clear selection");
    });

    test("works in multi mode too, where it tracks the whole selection", () => {
        const controller = new MultiSelectBoxController({
            options: fruits,
            defaultValue: ["apple", "pear"],
            addons: [new ClearButtonAddon()],
        });

        expect(controller.getState().addons["clear-button"].visible).toBe(true);

        controller.clear();
        expect(controller.getState().addons["clear-button"].visible).toBe(false);
    });
});
