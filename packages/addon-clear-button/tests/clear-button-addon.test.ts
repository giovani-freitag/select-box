import { SingleSelectBoxController } from "@select-box/core";
import { describe, expect, test } from "vitest";

import { ClearButtonAddon } from "../src/index.js";

describe("ClearButtonAddon", () => {
    test("publishes a hidden slice when no value is selected", () => {
        const controller = new SingleSelectBoxController<string>({
            options: [{ value: "a", label: "A" }],
            addons: [new ClearButtonAddon()],
        });

        const slice = controller.getState().addons["clear-button"];

        expect(slice?.visible).toBe(false);
        expect(slice?.label).toBe("×");
        expect(slice?.ariaLabel).toBe("Clear selection");
    });

    test("flips visible to true once an option is committed", () => {
        const option = { value: "a", label: "Apple" } as const;
        const controller = new SingleSelectBoxController<string>({
            options: [option],
            addons: [new ClearButtonAddon()],
        });

        controller.commitOption(option);

        expect(controller.getState().addons["clear-button"]?.visible).toBe(true);
    });

    test("custom label and ariaLabel propagate to the snapshot slice", () => {
        const controller = new SingleSelectBoxController<string>({
            options: [{ value: "a", label: "A" }],
            initialValue: "a",
            addons: [new ClearButtonAddon({ label: "Clear", ariaLabel: "Reset selection" })],
        });

        const slice = controller.getState().addons["clear-button"];

        expect(slice?.label).toBe("Clear");
        expect(slice?.ariaLabel).toBe("Reset selection");
    });

    test("late registration via .use() still installs the slice", () => {
        const controller = new SingleSelectBoxController<string>({
            options: [{ value: "a", label: "A" }],
        });

        expect(controller.getState().addons["clear-button"]).toBeUndefined();

        controller.use(new ClearButtonAddon());

        expect(controller.getState().addons["clear-button"]?.visible).toBe(false);
    });
});
