import { describe, expect, test } from "vitest";

import { SingleSelectBoxController } from "../src/controllers/single-select-box-controller.js";
import type { SelectOption } from "../src/types.js";

interface Fruit {
    id: number;
    name: string;
}

const fruits: ReadonlyArray<SelectOption<Fruit>> = [
    { value: { id: 1, name: "apple" }, label: "Apple", group: "Pomes" },
    { value: { id: 2, name: "pear" }, label: "Pear", group: "Pomes" },
    { value: { id: 3, name: "peach" }, label: "Peach", group: "Stone fruits" },
    { value: { id: 4, name: "plum" }, label: "Plum", group: "Stone fruits", disabled: true },
    { value: { id: 5, name: "lemon" }, label: "Lemon" },
];

describe("SingleSelectBoxController", () => {
    test("normalises flat options into named groups plus a trailing ungrouped bucket", () => {
        const controller = new SingleSelectBoxController<Fruit>({
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
        const controller = new SingleSelectBoxController<Fruit>({
            options: fruits,
            initialValue: fruits[2]!.value,
        });

        controller.open();

        const snapshot = controller.getState();

        expect(snapshot.activeOption?.label).toBe("Peach");
        expect(snapshot.activeIndex).toBe(2);
    });

    test("opens with first selectable option active and skips disabled ones during keyboard nav", () => {
        const controller = new SingleSelectBoxController<Fruit>({ options: fruits });

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
        const controller = new SingleSelectBoxController<Fruit>({ options: fruits });

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
        const controller = new SingleSelectBoxController<Fruit>({ options: fruits });
        let notifications = 0;
        controller.subscribe(() => {
            notifications += 1;
        });

        controller.open();
        controller.moveActive(1);
        controller.commitActive();

        const snapshot = controller.getState();

        expect(snapshot.value?.name).toBe("pear");
        expect(snapshot.selectedOption?.label).toBe("Pear");
        expect(snapshot.open).toBe(false);
        expect(snapshot.query).toBe("");
        expect(notifications).toBeGreaterThanOrEqual(3);
    });

    test("commitOption ignores disabled options", () => {
        const controller = new SingleSelectBoxController<Fruit>({ options: fruits });
        const disabledOption = fruits.find((option) => option.disabled);

        controller.commitOption(disabledOption!);

        expect(controller.getState().value).toBeNull();
    });

    test("isEmpty reflects when filter yields no matches", () => {
        const controller = new SingleSelectBoxController<Fruit>({ options: fruits });

        controller.setQuery("xyz");

        const snapshot = controller.getState();

        expect(snapshot.isEmpty).toBe(true);
        expect(snapshot.filteredGroups).toHaveLength(0);
        expect(snapshot.activeIndex).toBe(-1);
    });

    test("clear resets value and query", () => {
        const controller = new SingleSelectBoxController<Fruit>({
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
