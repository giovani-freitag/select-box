import type { SelectionValue } from "@select-box/core";
import { afterEach, describe, expect, test } from "vitest";

import { defineSelectBoxElement, type SelectBox } from "../src/index.js";

interface Fruit {
    readonly value: string;
    readonly label: string;
}

const fruits: ReadonlyArray<Fruit> = [
    { value: "apple", label: "Apple" },
    { value: "pear", label: "Pear" },
    { value: "grape", label: "Grape" },
];

defineSelectBoxElement("select-box-lit-inline-test");

async function mount(options: { multi?: boolean } = {}): Promise<SelectBox> {
    const element = document.createElement("select-box-lit-inline-test") as SelectBox;
    element.options = fruits;
    element.surface = "inline";
    if (options.multi) element.multi = true;
    document.body.append(element);
    await element.updateComplete;
    return element;
}

function chips(element: SelectBox): HTMLButtonElement[] {
    return [...element.querySelectorAll<HTMLButtonElement>("[data-select-chip]")];
}

function pressedStates(element: SelectBox): Array<string | null> {
    return chips(element).map((chip) => chip.getAttribute("aria-pressed"));
}

afterEach(() => {
    document.body.innerHTML = "";
});

describe("<select-box surface=\"inline\" /> (Lit)", () => {
    test("renders one chip per option and no popover", async () => {
        const element = await mount();

        expect(chips(element)).toHaveLength(fruits.length);
        expect(element.querySelector("[data-select-popover]")).toBeNull();
        expect(element.querySelector("[data-select-input]")).toBeNull();
        expect(element.querySelector("[data-select-surface='inline']")).not.toBeNull();
    });

    test("single mode replaces selection on chip click", async () => {
        const element = await mount();
        const changes: SelectionValue[] = [];
        element.addEventListener("change", () => changes.push(element.value));

        chips(element)[0]!.click();
        await element.updateComplete;
        chips(element)[1]!.click();
        await element.updateComplete;

        expect(changes).toEqual(["apple", "pear"]);
        expect(pressedStates(element)).toEqual(["false", "true", "false"]);
    });

    test("multi mode toggles selection on each chip click", async () => {
        const element = await mount({ multi: true });

        chips(element)[0]!.click();
        await element.updateComplete;
        chips(element)[2]!.click();
        await element.updateComplete;

        expect(element.value).toEqual(["apple", "grape"]);
        expect(pressedStates(element)).toEqual(["true", "false", "true"]);

        chips(element)[0]!.click();
        await element.updateComplete;

        expect(element.value).toEqual(["grape"]);
        expect(pressedStates(element)).toEqual(["false", "false", "true"]);
    });
});
