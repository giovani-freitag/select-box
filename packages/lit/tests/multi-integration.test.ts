// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, test } from "vitest";

import { defineSelectBoxElement, type SelectBox } from "../src/index.js";

beforeAll(() => {
    const proto = HTMLElement.prototype as HTMLElement & {
        attachInternals: () => ElementInternals;
    };
    const original = proto.attachInternals;
    proto.attachInternals = function () {
        const internals = original.call(this) as ElementInternals & Record<string, unknown>;
        if (typeof internals.setFormValue !== "function") {
            internals.setFormValue = () => {};
        }
        if (typeof internals.setValidity !== "function") {
            internals.setValidity = () => {};
        }
        return internals;
    };
});

interface Fruit {
    readonly value: string;
    readonly label: string;
}

const fruits: ReadonlyArray<Fruit> = [
    { value: "apple", label: "Apple" },
    { value: "pear", label: "Pear" },
    { value: "grape", label: "Grape" },
];

defineSelectBoxElement("select-box-lit-multi-test");

async function mount(options: { multi?: boolean } = {}): Promise<SelectBox> {
    const element = document.createElement("select-box-lit-multi-test") as SelectBox;
    element.options = fruits;
    if (options.multi) element.multi = true;
    document.body.append(element);
    await element.updateComplete;
    return element;
}

afterEach(() => {
    document.body.innerHTML = "";
});

describe("<select-box multi /> (Lit)", () => {
    test("renders with the multi marker on the root", async () => {
        const element = await mount({ multi: true });

        expect(element.dataset["selectMode"]).toBe("multi");
    });

    test("commitOption toggles chips and keeps the popover open", async () => {
        const element = await mount({ multi: true });
        const apple = fruits[0]!;
        const pear = fruits[1]!;

        const view = element as unknown as { selectedOptions: ReadonlyArray<Fruit> };

        const input = element.querySelector<HTMLInputElement>("[data-select-input]")!;
        input.focus();
        await element.updateComplete;

        const appleButton = [...element.querySelectorAll<HTMLButtonElement>("[data-select-option]")]
            .find((option) => option.textContent?.includes("Apple"))!;
        appleButton.click();
        await element.updateComplete;

        expect(view.selectedOptions.map((option) => option.value)).toEqual([apple.value]);
        expect(element.querySelector("[data-select-popover]")).not.toBeNull();

        const pearButton = [...element.querySelectorAll<HTMLButtonElement>("[data-select-option]")]
            .find((option) => option.textContent?.includes("Pear"))!;
        pearButton.click();
        await element.updateComplete;

        expect(view.selectedOptions.map((option) => option.value)).toEqual([apple.value, pear.value]);
    });

    test("toggling .multi from true to false preserves the first selection", async () => {
        const element = await mount({ multi: true });
        const apple = fruits[0]!;
        const pear = fruits[1]!;

        const input = element.querySelector<HTMLInputElement>("[data-select-input]")!;
        input.focus();
        await element.updateComplete;

        [...element.querySelectorAll<HTMLButtonElement>("[data-select-option]")]
            .find((option) => option.textContent?.includes("Pear"))!
            .click();
        await element.updateComplete;
        [...element.querySelectorAll<HTMLButtonElement>("[data-select-option]")]
            .find((option) => option.textContent?.includes("Apple"))!
            .click();
        await element.updateComplete;

        expect(element.value).toEqual([pear.value, apple.value]);

        element.multi = false;
        await element.updateComplete;

        expect(element.dataset["selectMode"]).toBe("single");
        expect(element.value).toBe(pear.value);
        expect(element.querySelectorAll("[data-select-chip]")).toHaveLength(0);
    });

    test("toggling .multi from false to true wraps the held value as a singleton chip", async () => {
        const element = await mount();
        const apple = fruits[0]!;
        const input = element.querySelector<HTMLInputElement>("[data-select-input]")!;
        input.focus();
        await element.updateComplete;
        [...element.querySelectorAll<HTMLButtonElement>("[data-select-option]")]
            .find((option) => option.textContent?.includes("Apple"))!
            .click();
        await element.updateComplete;

        expect(element.value).toBe(apple.value);

        element.multi = true;
        await element.updateComplete;

        expect(element.dataset["selectMode"]).toBe("multi");
        expect(element.value).toEqual([apple.value]);
        const chips = [...element.querySelectorAll("[data-select-chip]")].map((chip) =>
            chip.textContent?.replace("×", "").trim(),
        );
        expect(chips).toEqual(["Apple"]);
    });
});
