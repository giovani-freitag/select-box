import { describe, expect, test, vi } from "vitest";

import { MultiSelectBoxController, SingleSelectBoxController } from "../src/index.js";

const FRUITS = [
    { value: "apple", label: "Apple" },
    { value: "pear", label: "Pear" },
];

describe("committing a value that changes nothing", () => {
    test("publishes no snapshot in single mode", () => {
        const controller = new SingleSelectBoxController({
            options: FRUITS,
            defaultValue: "apple",
        });
        const listener = vi.fn();
        controller.subscribe(listener);

        controller.commitValue("apple");

        expect(listener).not.toHaveBeenCalled();
    });

    test("publishes no snapshot in multi mode, where the value is rebuilt as an array", () => {
        const controller = new MultiSelectBoxController({
            options: FRUITS,
            defaultValue: ["apple", "pear"],
        });
        const listener = vi.fn();
        controller.subscribe(listener);

        controller.commitValue(["apple", "pear"]);

        expect(listener).not.toHaveBeenCalled();
    });

    test("keeps the multi value referentially stable so wrappers can skip a render", () => {
        const controller = new MultiSelectBoxController({
            options: FRUITS,
            defaultValue: ["apple"],
        });
        const before = controller.getState().value;

        controller.commitValue(["apple"]);

        expect(controller.getState().value).toBe(before);
    });

    test("still publishes when the multi selection actually changes", () => {
        const controller = new MultiSelectBoxController({
            options: FRUITS,
            defaultValue: ["apple"],
        });
        const listener = vi.fn();
        controller.subscribe(listener);

        controller.commitValue(["apple", "pear"]);

        expect(listener).toHaveBeenCalledTimes(1);
    });

    test("treats a reordered selection as a change", () => {
        const controller = new MultiSelectBoxController({
            options: FRUITS,
            defaultValue: ["apple", "pear"],
        });
        const listener = vi.fn();
        controller.subscribe(listener);

        controller.commitValue(["pear", "apple"]);

        expect(listener).toHaveBeenCalledTimes(1);
    });
});
