import { describe, expect, test } from "vitest";

import { SelectBoxController } from "../src/controllers/select-box-controller.js";

const fruits = [
    { value: "apple", label: "Apple" },
    { value: "pear", label: "Pear" },
    { value: "lemon", label: "Lemon" },
];

describe("SelectBoxController.setMode", () => {
    test("single → multi wraps the held key as a singleton array", () => {
        const controller = new SelectBoxController({
            options: fruits,
            initialValue: "apple",
        });

        controller.setMode("multi");

        const snapshot = controller.getState();
        expect(snapshot.mode).toBe("multi");
        expect(snapshot.value).toEqual(["apple"]);
        expect(snapshot.selectedOptions.map((option) => option.value)).toEqual(["apple"]);
    });

    test("single with null value → multi yields an empty array", () => {
        const controller = new SelectBoxController({ options: fruits });

        controller.setMode("multi");

        expect(controller.getState().value).toEqual([]);
    });

    test("multi → single keeps the first selected key (native <select> semantics)", () => {
        const controller = new SelectBoxController({
            mode: "multi",
            options: fruits,
            initialValue: ["pear", "apple", "lemon"],
        });

        controller.setMode("single");

        const snapshot = controller.getState();
        expect(snapshot.mode).toBe("single");
        expect(snapshot.value).toBe("pear");
        expect(snapshot.selectedOption?.label).toBe("Pear");
    });

    test("multi with empty selection → single yields null", () => {
        const controller = new SelectBoxController({
            mode: "multi",
            options: fruits,
            initialValue: [],
        });

        controller.setMode("single");

        expect(controller.getState().value).toBeNull();
    });

    test("commit semantics flip after setMode (replace ↔ toggle)", () => {
        const controller = new SelectBoxController({
            options: fruits,
            initialValue: "apple",
        });

        // Single mode: commit replaces.
        controller.commitOption(fruits[1]!);
        expect(controller.getState().value).toBe("pear");

        controller.setMode("multi");
        // Multi mode: commit toggles. "pear" is already there → removed.
        controller.commitOption(fruits[1]!);
        expect(controller.getState().value).toEqual([]);

        // Adding via toggle.
        controller.commitOption(fruits[0]!);
        controller.commitOption(fruits[2]!);
        expect(controller.getState().value).toEqual(["apple", "lemon"]);
    });

    test("setMode is a no-op when already in the requested mode", () => {
        const controller = new SelectBoxController({ options: fruits, initialValue: "apple" });
        let notifications = 0;
        controller.subscribe(() => {
            notifications += 1;
        });

        controller.setMode("single");

        expect(notifications).toBe(0);
        expect(controller.getState().value).toBe("apple");
    });

    test("setMode publishes a single notification with the new snapshot", () => {
        const controller = new SelectBoxController({
            options: fruits,
            initialValue: "apple",
        });
        let notifications = 0;
        let lastSnapshotMode = controller.getState().mode;
        controller.subscribe(() => {
            notifications += 1;
            lastSnapshotMode = controller.getState().mode;
        });

        controller.setMode("multi");

        expect(notifications).toBe(1);
        expect(lastSnapshotMode).toBe("multi");
    });
});
