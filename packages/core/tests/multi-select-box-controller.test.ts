import { describe, expect, test } from "vitest";

import { MultiSelectBoxController } from "../src/controllers/multi-select-box-controller.js";
import type { SelectOption } from "../src/types.js";

interface FruitExtra {
    id: number;
    name: string;
}

type Fruit = SelectOption<FruitExtra>;

const fruits: ReadonlyArray<Fruit> = [
    { value: "apple", label: "Apple", group: "Pomes", id: 1, name: "apple" },
    { value: "pear", label: "Pear", group: "Pomes", id: 2, name: "pear" },
    { value: "peach", label: "Peach", group: "Stone fruits", id: 3, name: "peach" },
    { value: "plum", label: "Plum", group: "Stone fruits", disabled: true, id: 4, name: "plum" },
    { value: "lemon", label: "Lemon", id: 5, name: "lemon" },
];

describe("MultiSelectBoxController", () => {
    test("starts with an empty selection", () => {
        const controller = new MultiSelectBoxController<FruitExtra>({ options: fruits });

        const snapshot = controller.getState();

        expect(snapshot.mode).toBe("multi");
        expect(snapshot.value).toEqual([]);
        expect(snapshot.selectedOption).toBeNull();
        expect(snapshot.selectedOptions).toEqual([]);
    });

    test("commitOption adds to the selection without closing the popover", () => {
        const controller = new MultiSelectBoxController<FruitExtra>({ options: fruits });
        controller.open();
        let notifications = 0;
        controller.subscribe(() => {
            notifications += 1;
        });

        controller.commitOption(fruits[0]!);
        controller.commitOption(fruits[1]!);

        const snapshot = controller.getState();

        expect(snapshot.value).toEqual(["apple", "pear"]);
        expect(snapshot.selectedOptions.map((option) => option.label)).toEqual(["Apple", "Pear"]);
        expect(snapshot.selectedOption?.label).toBe("Apple");
        expect(snapshot.open).toBe(true);
        expect(notifications).toBe(2);
    });

    test("commitOption toggles an already-selected option off", () => {
        const controller = new MultiSelectBoxController<FruitExtra>({
            options: fruits,
            defaultValue: ["apple", "pear"],
        });

        controller.commitOption(fruits[0]!);

        const snapshot = controller.getState();

        expect(snapshot.value).toEqual(["pear"]);
        expect(snapshot.selectedOption?.label).toBe("Pear");
    });

    test("commitOption ignores disabled options", () => {
        const controller = new MultiSelectBoxController<FruitExtra>({ options: fruits });
        const disabledOption = fruits.find((option) => option.disabled)!;

        controller.commitOption(disabledOption);

        expect(controller.getState().value).toEqual([]);
    });

    test("commitValue replaces the entire selection from a list", () => {
        const controller = new MultiSelectBoxController<FruitExtra>({ options: fruits });

        controller.commitValue(["pear", "lemon"]);

        const snapshot = controller.getState();

        expect(snapshot.value).toEqual(["pear", "lemon"]);
        expect(snapshot.selectedOptions.map((option) => option.label)).toEqual(["Pear", "Lemon"]);
    });

    test("commitValue drops unknown and disabled keys silently", () => {
        const controller = new MultiSelectBoxController<FruitExtra>({ options: fruits });

        controller.commitValue(["pear", "plum", "unknown"]);

        expect(controller.getState().value).toEqual(["pear"]);
    });

    test("clear empties the selection", () => {
        const controller = new MultiSelectBoxController<FruitExtra>({
            options: fruits,
            defaultValue: ["apple", "pear"],
        });

        controller.clear();

        const snapshot = controller.getState();

        expect(snapshot.value).toEqual([]);
        expect(snapshot.selectedOptions).toEqual([]);
        expect(snapshot.selectedOption).toBeNull();
    });

    test("open() lands on the first selected option when there is a selection", () => {
        const controller = new MultiSelectBoxController<FruitExtra>({
            options: fruits,
            defaultValue: ["peach"],
        });

        controller.open();

        const snapshot = controller.getState();

        expect(snapshot.activeOption?.label).toBe("Peach");
    });

    test("defaultValue coerces numeric input", () => {
        const controller = new MultiSelectBoxController<{ tag: string }>({
            options: [
                { value: 1 as unknown as string, label: "One", tag: "uno" },
                { value: 2 as unknown as string, label: "Two", tag: "dos" },
            ],
            defaultValue: [1, 2],
        });

        const snapshot = controller.getState();

        expect(snapshot.value).toEqual(["1", "2"]);
        expect(snapshot.selectedOptions.map((option) => option.tag)).toEqual(["uno", "dos"]);
    });

    test("commitActive after keyboard nav toggles the highlighted option", () => {
        const controller = new MultiSelectBoxController<FruitExtra>({ options: fruits });
        controller.open();
        controller.moveActive(1);
        controller.commitActive();

        expect(controller.getState().value).toEqual(["pear"]);

        controller.commitActive();

        expect(controller.getState().value).toEqual([]);
    });

    test("snapshot.mode reflects the controller mode", () => {
        const controller = new MultiSelectBoxController<FruitExtra>({ options: fruits });

        expect(controller.getState().mode).toBe("multi");
    });
});
