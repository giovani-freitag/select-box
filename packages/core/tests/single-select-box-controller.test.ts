import { describe, expect, test } from "vitest";

import { SingleSelectBoxController } from "../src/controllers/single-select-box-controller.js";
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

describe("SingleSelectBoxController", () => {
    test("drops an initialValue that names no known option", () => {
        const controller = new SingleSelectBoxController<FruitExtra>({
            options: fruits,
            initialValue: "durian",
        });

        expect(controller.getState().value).toBeNull();
        expect(controller.getState().selectedOption).toBeNull();
    });

    test("drops an initialValue that names a disabled option", () => {
        const controller = new SingleSelectBoxController<FruitExtra>({
            options: fruits,
            initialValue: "plum",
        });

        expect(controller.getState().value).toBeNull();
    });

    test("keeps an initialValue that names a selectable option", () => {
        const controller = new SingleSelectBoxController<FruitExtra>({
            options: fruits,
            initialValue: "pear",
        });

        expect(controller.getState().value).toBe("pear");
    });

    test("swapping the options keeps a selection that still exists", () => {
        const controller = new SingleSelectBoxController<FruitExtra>({
            options: fruits,
            initialValue: "pear",
        });

        controller.setOptions([
            { value: "pear", label: "Pear", id: 2, name: "pear" },
            { value: "fig", label: "Fig", id: 6, name: "fig" },
        ]);

        expect(controller.getState().value).toBe("pear");
        expect(controller.getState().filteredGroups[0]!.options.map((o) => o.value)).toEqual([
            "pear",
            "fig",
        ]);
    });

    test("swapping the options drops a selection that no longer exists", () => {
        const controller = new SingleSelectBoxController<FruitExtra>({
            options: fruits,
            initialValue: "pear",
        });

        controller.setOptions([{ value: "fig", label: "Fig", id: 6, name: "fig" }]);

        expect(controller.getState().value).toBeNull();
    });

    test("the highlighted row follows its option across a swap", () => {
        const controller = new SingleSelectBoxController<FruitExtra>({ options: fruits });
        controller.open();
        controller.moveActive(1);
        controller.moveActive(1);
        const highlighted = controller.getState().activeOption!.value;

        controller.setOptions([
            { value: "fig", label: "Fig", id: 6, name: "fig" },
            ...fruits,
        ]);

        expect(controller.getState().activeOption!.value).toBe(highlighted);
    });

    test("swapping the options keeps the query and the open state", () => {
        const controller = new SingleSelectBoxController<FruitExtra>({ options: fruits });
        controller.open();
        controller.setQuery("pe");

        controller.setOptions([...fruits, { value: "fig", label: "Fig", id: 6, name: "fig" }]);

        expect(controller.getState().open).toBe(true);
        expect(controller.getState().query).toBe("pe");
    });

    test("disabled refuses to open, type, commit or clear", () => {
        const controller = new SingleSelectBoxController<FruitExtra>({
            options: fruits,
            initialValue: "pear",
            disabled: true,
        });

        controller.open();
        controller.setQuery("app");
        controller.commitValue("apple");
        controller.clear();

        const snapshot = controller.getState();
        expect(snapshot.open).toBe(false);
        expect(snapshot.query).toBe("");
        expect(snapshot.value).toBe("pear");
        expect(snapshot.disabled).toBe(true);
    });

    test("readOnly refuses to open and to change anything", () => {
        const controller = new SingleSelectBoxController<FruitExtra>({
            options: fruits,
            initialValue: "pear",
            readOnly: true,
        });

        controller.open();
        controller.moveActive(1);
        controller.setQuery("app");
        controller.commitValue("apple");
        controller.clear();

        const snapshot = controller.getState();
        expect(snapshot.open).toBe(false);
        expect(snapshot.query).toBe("");
        expect(snapshot.value).toBe("pear");
        expect(snapshot.readOnly).toBe(true);
    });

    test("commitOption and commitActive are refused while read-only", () => {
        const controller = new SingleSelectBoxController<FruitExtra>({ options: fruits });
        controller.open();
        controller.setInteractivity({ readOnly: true });

        controller.commitOption(fruits[0]!);
        controller.commitActive();

        expect(controller.getState().value).toBeNull();
    });

    test("disabling a live controller closes it", () => {
        const controller = new SingleSelectBoxController<FruitExtra>({ options: fruits });
        controller.open();

        controller.setInteractivity({ disabled: true });

        expect(controller.getState().open).toBe(false);
    });

    test("lifting the flags restores interaction", () => {
        const controller = new SingleSelectBoxController<FruitExtra>({
            options: fruits,
            disabled: true,
        });

        controller.setInteractivity({ disabled: false });
        controller.open();
        expect(controller.getState().open).toBe(true);

        controller.commitValue("apple");

        expect(controller.getState().value).toBe("apple");
    });

    test("lands inside the list for any navigation delta", () => {
        const controller = new SingleSelectBoxController<FruitExtra>({ options: fruits });
        const selectable = 4;
        const landings: number[] = [];

        controller.open();
        for (const delta of [-7, -5, -4, -3, -1, 1, 3, 4, 5, 7]) {
            controller.moveActive(delta);
            landings.push(controller.getState().activeIndex);
        }

        expect(landings.every((index) => index >= 0 && index < selectable)).toBe(true);
    });


    test("normalises flat options into named groups plus a trailing ungrouped bucket", () => {
        const controller = new SingleSelectBoxController<FruitExtra>({
            options: fruits,
            ungroupedLabel: "Other",
        });

        const snapshot = controller.getState();

        expect(snapshot.filteredGroups.map((group) => group.label)).toEqual([
            "Pomes",
            "Stone fruits",
            "Other",
        ]);
        expect(snapshot.filteredGroups[0]?.options).toHaveLength(2);
        expect(snapshot.filteredGroups[2]?.options).toHaveLength(1);
    });

    test("opens with the selected option active when there is a current value", () => {
        const controller = new SingleSelectBoxController<FruitExtra>({
            options: fruits,
            initialValue: fruits[2]!.value,
        });

        controller.open();

        const snapshot = controller.getState();

        expect(snapshot.activeOption?.label).toBe("Peach");
        expect(snapshot.activeIndex).toBe(2);
    });

    test("opens with first selectable option active and skips disabled ones during keyboard nav", () => {
        const controller = new SingleSelectBoxController<FruitExtra>({ options: fruits });

        controller.open();
        controller.moveActive(1);
        controller.moveActive(1);
        controller.moveActive(1);

        const snapshot = controller.getState();

        expect(snapshot.open).toBe(true);
        expect(snapshot.activeOption?.label).toBe("Lemon");
        expect(snapshot.activeOption?.disabled).toBeUndefined();
    });

    test("setQuery filters across groups and drops empty ones from the snapshot", () => {
        const controller = new SingleSelectBoxController<FruitExtra>({ options: fruits });

        controller.setQuery("pe");

        const snapshot = controller.getState();

        expect(snapshot.filteredGroups.map((group) => group.key)).toEqual([
            "Pomes",
            "Stone fruits",
        ]);
        expect(snapshot.filteredGroups.flatMap((group) => group.options.map((option) => option.label)))
            .toEqual(["Pear", "Peach"]);
        expect(snapshot.activeOption?.label).toBe("Pear");
    });

    test("commitActive selects the active option, closes, clears query, and notifies listeners", () => {
        const controller = new SingleSelectBoxController<FruitExtra>({ options: fruits });
        let notifications = 0;
        controller.subscribe(() => {
            notifications += 1;
        });

        controller.open();
        controller.moveActive(1);
        controller.commitActive();

        const snapshot = controller.getState();

        expect(snapshot.value).toBe("pear");
        expect(snapshot.selectedOption?.name).toBe("pear");
        expect(snapshot.selectedOption?.label).toBe("Pear");
        expect(snapshot.open).toBe(false);
        expect(snapshot.query).toBe("");
        expect(notifications).toBeGreaterThanOrEqual(3);
    });

    test("commitOption ignores disabled options", () => {
        const controller = new SingleSelectBoxController<FruitExtra>({ options: fruits });
        const disabledOption = fruits.find((option) => option.disabled);

        controller.commitOption(disabledOption!);

        expect(controller.getState().value).toBeNull();
    });

    test("commitValue resolves the option by string value (coerced)", () => {
        const controller = new SingleSelectBoxController<FruitExtra>({ options: fruits });

        controller.commitValue("pear");

        expect(controller.getState().selectedOption?.label).toBe("Pear");
        expect(controller.getState().value).toBe("pear");
    });

    test("numeric values are silently coerced to strings", () => {
        const controller = new SingleSelectBoxController<{ tag: string }>({
            options: [
                { value: 1 as unknown as string, label: "One", tag: "uno" },
                { value: 2 as unknown as string, label: "Two", tag: "dos" },
            ],
            initialValue: 2,
        });

        const snapshot = controller.getState();

        expect(snapshot.value).toBe("2");
        expect(snapshot.selectedOption?.value).toBe("2");
        expect(snapshot.selectedOption?.tag).toBe("dos");
    });

    test("isEmpty reflects when filter yields no matches", () => {
        const controller = new SingleSelectBoxController<FruitExtra>({ options: fruits });

        controller.setQuery("xyz");

        const snapshot = controller.getState();

        expect(snapshot.isEmpty).toBe(true);
        expect(snapshot.filteredGroups).toHaveLength(0);
        expect(snapshot.activeIndex).toBe(-1);
    });

    test("clear resets value and query", () => {
        const controller = new SingleSelectBoxController<FruitExtra>({
            options: fruits,
            initialValue: fruits[0]!.value,
        });

        controller.setQuery("ap");
        controller.clear();

        const snapshot = controller.getState();

        expect(snapshot.value).toBeNull();
        expect(snapshot.query).toBe("");
    });
});
