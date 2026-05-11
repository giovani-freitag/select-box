import { beforeAll, describe, expect, test } from "vitest";

import { defineSelectBoxElement, type SelectBoxElement } from "../src/index.js";

interface Fruit {
    readonly id: number;
    readonly name: string;
}

const fruits = [
    { value: { id: 1, name: "apple" }, label: "Apple", group: "Pomes" },
    { value: { id: 2, name: "pear" }, label: "Pear", group: "Pomes" },
    { value: { id: 3, name: "lemon" }, label: "Lemon" },
];

beforeAll(() => {
    defineSelectBoxElement();
});

describe("<select-box>", () => {
    test("renders trigger with placeholder when no value is selected", () => {
        const element = document.createElement("select-box") as SelectBoxElement<Fruit>;
        element.setAttribute("placeholder", "Pick a fruit");
        element.options = fruits;
        document.body.append(element);

        const trigger = element.shadowRoot!.querySelector(".trigger");
        const value = element.shadowRoot!.querySelector(".value");

        expect(trigger).not.toBeNull();
        expect(value?.textContent).toBe("Pick a fruit");

        element.remove();
    });

    test("opens the popover and lists grouped options when toggled", () => {
        const element = document.createElement("select-box") as SelectBoxElement<Fruit>;
        element.options = fruits;
        element.setAttribute("ungrouped-label", "Other");
        document.body.append(element);

        const trigger = element.shadowRoot!.querySelector<HTMLButtonElement>(".trigger");
        trigger?.click();

        const popover = element.shadowRoot!.querySelector<HTMLDivElement>(".popover");
        const groupLabels = [...element.shadowRoot!.querySelectorAll(".group-label")].map(
            (node) => node.textContent,
        );
        const options = [...element.shadowRoot!.querySelectorAll(".option")].map(
            (node) => node.textContent,
        );

        expect(popover?.hidden).toBe(false);
        expect(groupLabels).toEqual(["Pomes", "Other"]);
        expect(options).toEqual(["Apple", "Pear", "Lemon"]);

        element.remove();
    });

    test("dispatches change Event when an option is committed; value is on the element", () => {
        const element = document.createElement("select-box") as SelectBoxElement<Fruit>;
        element.options = fruits;
        document.body.append(element);

        const observed: Array<Fruit | null> = [];
        element.addEventListener("change", (event) => {
            observed.push((event.target as SelectBoxElement<Fruit>).value);
        });

        element.shadowRoot!.querySelector<HTMLButtonElement>(".trigger")?.click();
        const firstOption = element.shadowRoot!.querySelector<HTMLButtonElement>(".option");
        firstOption?.click();

        expect(observed).toHaveLength(1);
        expect(observed[0]?.name).toBe("apple");
        expect(element.value?.name).toBe("apple");

        element.remove();
    });
});
