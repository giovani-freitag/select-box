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

function mount(options: { multi?: boolean } = {}): {
    element: SelectBoxElement;
    input: HTMLInputElement;
} {
    const element = document.createElement("select-box");
    element.setAttribute("placeholder", "Pick fruits");
    if (options.multi) element.setAttribute("multi", "");
    element.options = fruits;
    document.body.append(element);
    const input = element.shadowRoot!.querySelector<HTMLInputElement>(".input")!;
    return { element, input };
}

describe("<select-box multi> integration", () => {
    beforeEach(() => {
        document.body.innerHTML = "";
    });

    test("renders with mode='multi' on the host when the multi attribute is present", () => {
        const { element } = mount({ multi: true });

        expect(element.getAttribute("mode")).toBe("multi");
    });

    test("clicking an option commits as a chip and keeps the popover open", () => {
        const { element, input } = mount({ multi: true });
        input.focus();

        const appleButton = [
            ...element.shadowRoot!.querySelectorAll<HTMLButtonElement>(".option"),
        ].find((option) => option.textContent?.includes("Apple"))!;
        appleButton.click();

        expect(element.value).toEqual(["apple"]);
        expect(element.shadowRoot!.querySelector<HTMLDivElement>(".popover")?.hidden).toBe(false);
        const chips = element.shadowRoot!.querySelectorAll(".chip");
        expect(chips).toHaveLength(1);
    });

    test("chip remove button toggles the option off", () => {
        const { element, input } = mount({ multi: true });
        element.value = ["pear", "grape"];
        input.focus();

        const removeButton = element.shadowRoot!.querySelector<HTMLButtonElement>(".chip-remove")!;
        removeButton.click();

        expect(element.value).toEqual(["grape"]);
    });

    test("toggling the multi attribute off preserves the first selected option", () => {
        const { element, input } = mount({ multi: true });
        element.value = ["pear", "apple"];
        input.focus();

        element.removeAttribute("multi");

        expect(element.getAttribute("mode")).toBe("single");
        expect(element.value).toBe("pear");
        expect(element.shadowRoot!.querySelectorAll(".chip")).toHaveLength(0);
    });

    test("setting the multi attribute wraps the held value as a singleton chip", () => {
        const { element, input } = mount();
        element.value = "apple";
        input.focus();

        element.setAttribute("multi", "");

        expect(element.getAttribute("mode")).toBe("multi");
        expect(element.value).toEqual(["apple"]);
        const chips = [...element.shadowRoot!.querySelectorAll(".chip")];
        expect(chips).toHaveLength(1);
        expect(chips[0]?.textContent).toContain("Apple");
    });

    test("the element.multi property setter mirrors the attribute", () => {
        const { element } = mount();

        element.multi = true;

        expect(element.hasAttribute("multi")).toBe(true);
        expect(element.getAttribute("mode")).toBe("multi");
    });
});
