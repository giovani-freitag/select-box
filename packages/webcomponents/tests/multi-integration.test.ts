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

function mount(options: { multiple?: boolean } = {}): {
    element: SelectBoxElement;
    input: HTMLInputElement;
} {
    const element = document.createElement("select-box");
    element.setAttribute("placeholder", "Pick fruits");
    if (options.multiple) element.setAttribute("multiple", "");
    element.options = fruits;
    document.body.append(element);
    const input = element.querySelector<HTMLInputElement>("[data-select-input]")!;
    return { element, input };
}

describe("<select-box multi> integration", () => {
    beforeEach(() => {
        document.body.innerHTML = "";
    });

    test("renders with mode='multi' on the host when the multi attribute is present", () => {
        const { element } = mount({ multiple: true });

        expect(element.getAttribute("mode")).toBe("multi");
    });

    test("clicking an option commits as a chip and keeps the popover open", () => {
        const { element, input } = mount({ multiple: true });
        input.focus();

        const appleButton = [
            ...element.querySelectorAll<HTMLButtonElement>("[data-select-option]"),
        ].find((option) => option.textContent?.includes("Apple"))!;
        appleButton.click();

        expect(element.value).toEqual(["apple"]);
        expect(element.querySelector<HTMLDivElement>("[data-select-popover]")?.hidden).toBe(false);
        const chips = element.querySelectorAll("[data-select-chip]");
        expect(chips).toHaveLength(1);
    });

    test("chip remove button toggles the option off", () => {
        const { element, input } = mount({ multiple: true });
        element.value = ["pear", "grape"];
        input.focus();

        const removeButton = element.querySelector<HTMLButtonElement>("[data-select-chip-remove]")!;
        removeButton.click();

        expect(element.value).toEqual(["grape"]);
    });

    test("toggling the multi attribute off preserves the first selected option", () => {
        const { element, input } = mount({ multiple: true });
        element.value = ["pear", "apple"];
        input.focus();

        element.removeAttribute("multiple");

        expect(element.getAttribute("mode")).toBe("single");
        expect(element.value).toBe("pear");
        expect(element.querySelectorAll("[data-select-chip]")).toHaveLength(0);
    });

    test("setting the multi attribute wraps the held value as a singleton chip", () => {
        const { element, input } = mount();
        element.value = "apple";
        input.focus();

        element.setAttribute("multiple", "");

        expect(element.getAttribute("mode")).toBe("multi");
        expect(element.value).toEqual(["apple"]);
        const chips = [...element.querySelectorAll("[data-select-chip]")];
        expect(chips).toHaveLength(1);
        expect(chips[0]?.textContent).toContain("Apple");
    });

    test("the element.multiple property setter mirrors the attribute", () => {
        const { element } = mount();

        element.multiple = true;

        expect(element.hasAttribute("multiple")).toBe(true);
        expect(element.getAttribute("mode")).toBe("multi");
    });
});
