import { describe, expect, test } from "vitest";

import { defineSelectBoxElement } from "../src/index.js";

defineSelectBoxElement();

const FRUITS = [
    { value: "apple", label: "Apple" },
    { value: "pear", label: "Pear" },
];

interface Mounted extends HTMLElement {
    options: typeof FRUITS;
    value: unknown;
    multiple: boolean;
}

function mount(markup: string): Mounted {
    document.body.innerHTML = markup;
    const element = document.querySelector("select-box") as unknown as Mounted;
    element.options = FRUITS;
    return element;
}

function shown(element: Mounted): string {
    return element.querySelector<HTMLInputElement>("[data-select-input]")!.value;
}

describe("the value attribute", () => {
    test("seeds the selection straight from markup", () => {
        const element = mount('<select-box value="pear" placeholder="Pick"></select-box>');

        expect(element.value).toBe("pear");
        expect(shown(element)).toBe("Pear");
    });

    test("seeds a multi selection from a comma-separated list", () => {
        const element = mount(
            '<select-box multiple value="apple,pear" placeholder="Pick"></select-box>',
        );

        expect(element.value).toEqual(["apple", "pear"]);
    });

    test("keeps the property as the live selection, not the seed", () => {
        const element = mount('<select-box value="apple" placeholder="Pick"></select-box>');

        element.value = "pear";

        expect(element.value).toBe("pear");
        expect(element.getAttribute("value")).toBe("apple");
    });

    test("takes a later attribute change as the new selection", () => {
        const element = mount('<select-box value="apple" placeholder="Pick"></select-box>');

        element.setAttribute("value", "pear");

        expect(element.value).toBe("pear");
    });
});
