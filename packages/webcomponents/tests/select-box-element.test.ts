import { beforeAll, describe, expect, test } from "vitest";

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

describe("<select-box>", () => {
    test("renders the trigger input with placeholder when no value is selected", () => {
        const element = document.createElement("select-box") as SelectBoxElement<FruitExtra>;
        element.setAttribute("placeholder", "Pick a fruit");
        element.options = fruits;
        document.body.append(element);

        const trigger = element.shadowRoot!.querySelector(".trigger");
        const input = element.shadowRoot!.querySelector<HTMLInputElement>(".input");

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

        const caret = element.shadowRoot!.querySelector<HTMLButtonElement>(".caret");
        caret?.click();

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
        const element = document.createElement("select-box") as SelectBoxElement<FruitExtra>;
        element.options = fruits;
        document.body.append(element);

        const observed: Array<string | null> = [];
        element.addEventListener("change", (event) => {
            observed.push((event.target as SelectBoxElement<FruitExtra>).value);
        });

        element.shadowRoot!.querySelector<HTMLButtonElement>(".caret")?.click();
        const firstOption = element.shadowRoot!.querySelector<HTMLButtonElement>(".option");
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

    test("exposes the ElementInternals validity surface", () => {
        const element = document.createElement("select-box") as SelectBoxElement<FruitExtra>;
        element.options = fruits;
        document.body.append(element);

        expect(typeof element.checkValidity).toBe("function");
        expect(typeof element.reportValidity).toBe("function");
        expect(element.validity).toBeDefined();
        expect(element.willValidate).toBe(true);

        element.remove();
    });
});
