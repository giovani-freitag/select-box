import { beforeAll, beforeEach, describe, expect, test } from "vitest";

import { defineSelectBoxElement, type SelectBoxElement } from "../src/index.js";

const fruits = [
    { value: "apple", label: "Apple" },
    { value: "pear", label: "Pear" },
    { value: "grape", label: "Grape" },
];

beforeAll(() => {
    defineSelectBoxElement();
});

function mount(): { element: SelectBoxElement; input: HTMLInputElement } {
    const element = document.createElement("select-box");
    element.setAttribute("placeholder", "Pick a fruit");
    element.options = fruits;
    document.body.append(element);
    const input = element.shadowRoot!.querySelector<HTMLInputElement>(".input")!;
    return { element, input };
}

describe("<select-box> integration", () => {
    beforeEach(() => {
        document.body.innerHTML = "";
    });

    test("focusing the trigger input opens the popover", () => {
        const { element, input } = mount();

        input.focus();

        expect(element.shadowRoot!.querySelector<HTMLDivElement>(".popover")?.hidden).toBe(false);
    });

    test("typing into the input filters the option list", () => {
        const { element, input } = mount();
        input.focus();

        input.value = "ear";
        input.dispatchEvent(new Event("input", { bubbles: true }));

        const labels = [...element.shadowRoot!.querySelectorAll(".option")].map(
            (option) => option.textContent,
        );
        expect(labels).toEqual(["Pear"]);
    });

    test("Enter commits the active option and closes the popover", () => {
        const { element, input } = mount();
        const observed: Array<string | null> = [];
        element.addEventListener("change", (event) => {
            observed.push((event.target as SelectBoxElement).value);
        });

        input.focus();
        input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));

        expect(observed).toEqual(["apple"]);
        expect(element.shadowRoot!.querySelector<HTMLDivElement>(".popover")?.hidden).toBe(true);
    });

    test("Escape closes the popover without firing change", () => {
        const { element, input } = mount();
        let changes = 0;
        element.addEventListener("change", () => {
            changes += 1;
        });

        input.focus();
        input.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));

        expect(element.shadowRoot!.querySelector<HTMLDivElement>(".popover")?.hidden).toBe(true);
        expect(changes).toBe(0);
    });

    test("click outside the element closes the popover", () => {
        const { element, input } = mount();
        input.focus();
        expect(element.shadowRoot!.querySelector<HTMLDivElement>(".popover")?.hidden).toBe(false);

        document.body.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));

        expect(element.shadowRoot!.querySelector<HTMLDivElement>(".popover")?.hidden).toBe(true);
    });

    test("after committing, the input shows the selected option label when popover is closed", () => {
        const { element, input } = mount();
        input.focus();

        const grape = [...element.shadowRoot!.querySelectorAll<HTMLButtonElement>(".option")]
            .find((option) => option.textContent === "Grape")!;
        grape.click();

        expect(input.value).toBe("Grape");
        expect(element.value).toBe("grape");
    });
});
