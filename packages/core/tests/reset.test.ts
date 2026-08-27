import { describe, expect, test } from "vitest";

import { MultiSelectBoxController } from "../src/controllers/multi-select-box-controller.js";
import { SingleSelectBoxController } from "../src/controllers/single-select-box-controller.js";
import type { SelectOption } from "../src/types.js";

const fruits: ReadonlyArray<SelectOption> = [
    { value: "apple", label: "Apple" },
    { value: "pear", label: "Pear" },
    { value: "fig", label: "Fig", disabled: true },
];

describe("reset in single mode", () => {
    test("restores the default the control was built with, like a native select", () => {
        const controller = new SingleSelectBoxController({
            options: fruits,
            defaultValue: "apple",
        });
        controller.commitValue("pear");

        controller.reset();

        expect(controller.getState().value).toBe("apple");
    });

    test("empties when there was no default to come back to", () => {
        const controller = new SingleSelectBoxController({ options: fruits });
        controller.commitValue("pear");

        controller.reset();

        expect(controller.getState().value).toBeNull();
    });

    test("is not the same as clear, which empties whatever the default was", () => {
        const controller = new SingleSelectBoxController({
            options: fruits,
            defaultValue: "apple",
        });
        controller.commitValue("pear");

        controller.clear();

        expect(controller.getState().value).toBeNull();
    });

    test("restores the same default however many times it runs", () => {
        const controller = new SingleSelectBoxController({
            options: fruits,
            defaultValue: "apple",
        });

        controller.commitValue("pear");
        controller.reset();
        controller.commitValue("pear");
        controller.reset();

        expect(controller.getState().value).toBe("apple");
    });

    test("drops the query and closes the popover", () => {
        const controller = new SingleSelectBoxController({
            options: fruits,
            defaultValue: "apple",
        });
        controller.open();
        controller.setQuery("pe");

        controller.reset();

        const state = controller.getState();
        expect(state.query).toBe("");
        expect(state.open).toBe(false);
        expect(state.activeIndex).toBe(-1);
    });

    test("runs on a disabled control, the way the platform resets one", () => {
        const controller = new SingleSelectBoxController({
            options: fruits,
            defaultValue: "apple",
        });
        controller.commitValue("pear");
        controller.setInteractivity({ disabled: true, readOnly: false });

        controller.reset();

        expect(controller.getState().value).toBe("apple");
    });

    test("runs on a read-only control too", () => {
        const controller = new SingleSelectBoxController({
            options: fruits,
            defaultValue: "apple",
        });
        controller.commitValue("pear");
        controller.setInteractivity({ disabled: false, readOnly: true });

        controller.reset();

        expect(controller.getState().value).toBe("apple");
    });
});

describe("reset against a changed option list", () => {
    test("re-resolves the default, so an option that is gone does not come back", () => {
        const controller = new SingleSelectBoxController({
            options: fruits,
            defaultValue: "apple",
        });
        controller.commitValue("pear");
        controller.setOptions([{ value: "pear", label: "Pear" }]);

        controller.reset();

        expect(controller.getState().value).toBeNull();
    });

    test("restores the default once its option is loaded again", () => {
        const controller = new SingleSelectBoxController({
            options: [{ value: "pear", label: "Pear" }],
            defaultValue: "apple",
        });
        expect(controller.getState().value).toBeNull();

        controller.setOptions(fruits);
        controller.reset();

        expect(controller.getState().value).toBe("apple");
    });

    test("refuses a default that has since been disabled", () => {
        const controller = new SingleSelectBoxController({
            options: fruits,
            defaultValue: "apple",
        });
        controller.commitValue("pear");
        controller.setOptions([
            { value: "apple", label: "Apple", disabled: true },
            { value: "pear", label: "Pear" },
        ]);

        controller.reset();

        expect(controller.getState().value).toBeNull();
    });
});

describe("reset in multi mode", () => {
    test("restores every option the control started with", () => {
        const controller = new MultiSelectBoxController({
            options: fruits,
            defaultValue: ["apple", "pear"],
        });
        controller.commitValue([]);

        controller.reset();

        expect(controller.getState().value).toEqual(["apple", "pear"]);
    });

    test("removes the selections made since, not just the added ones", () => {
        const controller = new MultiSelectBoxController({
            options: fruits,
            defaultValue: ["apple"],
        });
        controller.commitValue(["apple", "pear"]);

        controller.reset();

        expect(controller.getState().value).toEqual(["apple"]);
    });

    test("empties when it started empty", () => {
        const controller = new MultiSelectBoxController({ options: fruits });
        controller.commitValue(["pear"]);

        controller.reset();

        expect(controller.getState().value).toEqual([]);
    });

    test("carries the default across a mode flip, as the driver coerces it", () => {
        const controller = new SingleSelectBoxController({
            options: fruits,
            defaultValue: "apple",
        });
        controller.commitValue("pear");
        controller.setMode("multi");

        controller.reset();

        expect(controller.getState().value).toEqual(["apple"]);
    });
});

describe("reset and subscribers", () => {
    test("publishes once so every view repaints", () => {
        const controller = new SingleSelectBoxController({
            options: fruits,
            defaultValue: "apple",
        });
        controller.commitValue("pear");
        let published = 0;
        controller.subscribe(() => {
            published += 1;
        });

        controller.reset();

        expect(published).toBe(1);
    });

    test("the published snapshot already carries the restored option", () => {
        const controller = new SingleSelectBoxController({
            options: fruits,
            defaultValue: "apple",
        });
        controller.commitValue("pear");
        let seen: string | null | undefined;
        controller.subscribe(() => {
            seen = controller.getState().selectedOption?.label ?? null;
        });

        controller.reset();

        expect(seen).toBe("Apple");
    });
});
