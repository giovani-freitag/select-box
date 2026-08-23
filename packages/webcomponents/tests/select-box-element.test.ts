import type { SelectionValue } from "@select-box/core";
import { afterEach, beforeAll, describe, expect, test } from "vitest";

import { defineSelectBoxElement, type SelectBoxElement } from "../src/index.js";

interface FruitExtra {
    readonly id: number;
    readonly name: string;
}

const fruits = [
    { value: "apple", label: "Apple", group: "Pomes", id: 1, name: "apple" },
    { value: "pear", label: "Pear", group: "Pomes", id: 2, name: "pear" },
    { value: "lemon", label: "Lemon", id: 3, name: "lemon" },
];

beforeAll(() => {
    defineSelectBoxElement();
});

/**
 * Mounts the element inside a real form so `FormData` can observe it.
 *
 * @param setup - Which form-facing attributes to declare.
 * @returns The form and the element, both attached to the document.
 */
afterEach(() => {
    document.body.innerHTML = "";
});

function mountInForm(setup: {
    readonly name?: string;
    readonly required?: boolean;
    readonly multi?: boolean;
}): { form: HTMLFormElement; element: SelectBoxElement<FruitExtra> } {
    const form = document.createElement("form");
    const element = document.createElement("select-box") as SelectBoxElement<FruitExtra>;
    if (setup.name !== undefined) element.setAttribute("name", setup.name);
    if (setup.required === true) element.setAttribute("required", "");
    if (setup.multi === true) element.setAttribute("multi", "");
    element.options = fruits;
    form.append(element);
    document.body.append(form);
    return { form, element };
}

describe("<select-box>", () => {
    test("renders the trigger input with placeholder when no value is selected", () => {
        const element = document.createElement("select-box") as SelectBoxElement<FruitExtra>;
        element.setAttribute("placeholder", "Pick a fruit");
        element.options = fruits;
        document.body.append(element);

        const trigger = element.querySelector("[data-select-trigger]");
        const input = element.querySelector<HTMLInputElement>("[data-select-input]");

        expect(trigger).not.toBeNull();
        expect(input).not.toBeNull();
        expect(input?.placeholder).toBe("Pick a fruit");
        expect(input?.value).toBe("");

        element.remove();
    });

    test("opens the popover and lists grouped options when toggled", () => {
        const element = document.createElement("select-box") as SelectBoxElement<FruitExtra>;
        element.options = fruits;
        element.setAttribute("ungrouped-label", "Other");
        document.body.append(element);

        const caret = element.querySelector<HTMLButtonElement>("[data-select-caret]");
        caret?.click();

        const popover = element.querySelector<HTMLDivElement>("[data-select-popover]");
        const groupLabels = [...element.querySelectorAll("[data-select-group-label]")].map(
            (node) => node.textContent,
        );
        const options = [...element.querySelectorAll("[data-select-option]")].map(
            (node) => node.textContent,
        );

        expect(popover?.hidden).toBe(false);
        expect(groupLabels).toEqual(["Pomes", "Other"]);
        expect(options).toEqual(["Apple", "Pear", "Lemon"]);

        element.remove();
    });

    test("dispatches change Event when an option is committed; value is on the element", () => {
        const element = document.createElement("select-box") as SelectBoxElement<FruitExtra>;
        element.options = fruits;
        document.body.append(element);

        const observed: SelectionValue[] = [];
        element.addEventListener("change", (event) => {
            observed.push((event.target as SelectBoxElement<FruitExtra>).value);
        });

        element.querySelector<HTMLButtonElement>("[data-select-caret]")?.click();
        const firstOption = element.querySelector<HTMLButtonElement>("[data-select-option]");
        firstOption?.click();

        expect(observed).toHaveLength(1);
        expect(observed[0]).toBe("apple");
        expect(element.value).toBe("apple");
        expect(element.selectedOption?.name).toBe("apple");

        element.remove();
    });

    test("declares itself form-associated", () => {
        const SelectBoxConstructor = customElements.get("select-box");

        expect((SelectBoxConstructor as unknown as { formAssociated?: boolean }).formAssociated).toBe(true);
    });

    test("submits the committed value under its name", () => {
        const { form, element } = mountInForm({ name: "fruit" });

        element.value = "pear";

        expect([...new FormData(form)]).toEqual([["fruit", "pear"]]);
    });

    test("submits one entry per selection in multi mode", () => {
        const { form, element } = mountInForm({ name: "fruit", multi: true });

        element.value = ["pear", "lemon"];

        expect([...new FormData(form)]).toEqual([
            ["fruit", "pear"],
            ["fruit", "lemon"],
        ]);
    });

    test("submits an empty entry while no option is selected", () => {
        const { form } = mountInForm({ name: "fruit" });

        expect([...new FormData(form)]).toEqual([["fruit", ""]]);
    });

    test("submits no entry at all when multi mode holds nothing", () => {
        const { form } = mountInForm({ name: "fruit", multi: true });

        expect([...new FormData(form)]).toEqual([]);
    });

    test("submits nothing when it carries no name", () => {
        const { form, element } = mountInForm({});

        element.value = "pear";

        expect([...new FormData(form)]).toEqual([]);
    });

    test("fails validation while required and empty, and passes once filled", () => {
        const { element } = mountInForm({ name: "fruit", required: true });

        expect(element.checkValidity()).toBe(false);
        expect(element.validationMessage).not.toBe("");

        element.value = "pear";

        expect(element.checkValidity()).toBe(true);
        expect(element.validationMessage).toBe("");
    });

});
