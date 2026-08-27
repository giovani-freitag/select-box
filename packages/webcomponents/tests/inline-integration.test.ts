import type { SelectionValue } from "@select-box/core";
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

function mount(options: { multiple?: boolean } = {}): SelectBoxElement {
    const element = document.createElement("select-box");
    element.setAttribute("surface", "inline");
    if (options.multiple) element.setAttribute("multiple", "");
    element.options = fruits;
    document.body.append(element);
    return element;
}

function chips(element: SelectBoxElement): HTMLButtonElement[] {
    return [...element.querySelectorAll<HTMLButtonElement>("[data-select-chip]")];
}

function pressedStates(element: SelectBoxElement): Array<string | null> {
    return chips(element).map((chip) => chip.getAttribute("aria-pressed"));
}

describe("<select-box surface=\"inline\"> integration", () => {
    beforeEach(() => {
        document.body.innerHTML = "";
    });

    test("renders one chip per option into the inline container", () => {
        const element = mount();

        expect(chips(element)).toHaveLength(fruits.length);
        expect(element.querySelector("[data-select-surface='inline']")).not.toBeNull();
    });

    test("single mode replaces selection on chip click", () => {
        const element = mount();
        const changes: SelectionValue[] = [];
        element.addEventListener("change", () => changes.push(element.value));

        chips(element)[0]!.click();
        chips(element)[1]!.click();

        expect(changes).toEqual(["apple", "pear"]);
        expect(pressedStates(element)).toEqual(["false", "true", "false"]);
    });

    test("multi mode toggles selection on each chip click", () => {
        const element = mount({ multiple: true });

        chips(element)[0]!.click();
        chips(element)[2]!.click();

        expect(element.value).toEqual(["apple", "grape"]);
        expect(pressedStates(element)).toEqual(["true", "false", "true"]);

        chips(element)[0]!.click();

        expect(element.value).toEqual(["grape"]);
        expect(pressedStates(element)).toEqual(["false", "false", "true"]);
    });
});
