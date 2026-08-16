// @vitest-environment jsdom
import type { SelectionValue } from "@select-box/core";
import { afterEach, beforeAll, describe, expect, test, vi } from "vitest";

import { defineSelectBoxElement, type SelectBox } from "../src/index.js";

// jsdom 25 ships partial ElementInternals — patch the form-association
// methods our component touches. Real-browser form-association behaviour
// is covered by the deferred matrix E2E suite (§6.3).
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

defineSelectBoxElement("select-box-lit-test");

async function mount(): Promise<SelectBox> {
    const element = document.createElement("select-box-lit-test") as SelectBox;
    element.setAttribute("placeholder", "Pick a fruit");
    element.options = fruits;
    document.body.append(element);
    await element.updateComplete;
    return element;
}

afterEach(() => {
    document.body.innerHTML = "";
});

describe("<SelectBox /> (Lit)", () => {
    test("renders the trigger input with placeholder and empty value", async () => {
        const element = await mount();

        const input = element.querySelector<HTMLInputElement>("[data-select-input]");
        expect(input).not.toBeNull();
        expect(input?.placeholder).toBe("Pick a fruit");
        expect(input?.value).toBe("");
    });

    test("focusing the input opens the popover", async () => {
        const element = await mount();
        const input = element.querySelector<HTMLInputElement>("[data-select-input]")!;

        input.focus();
        await element.updateComplete;

        expect(element.querySelector("[data-select-popover]")).not.toBeNull();
    });

    test("typing into the input filters the option list", async () => {
        const element = await mount();
        const input = element.querySelector<HTMLInputElement>("[data-select-input]")!;
        input.focus();
        await element.updateComplete;

        input.value = "ear";
        input.dispatchEvent(new Event("input", { bubbles: true }));
        await element.updateComplete;

        const labels = [...element.querySelectorAll("[data-select-option]")].map(
            (option) => option.textContent?.trim(),
        );
        expect(labels).toEqual(["Pear"]);
    });

    test("Enter commits the active option and closes the popover", async () => {
        const element = await mount();
        const input = element.querySelector<HTMLInputElement>("[data-select-input]")!;
        const changes: SelectionValue[] = [];
        element.addEventListener("change", () => changes.push(element.value));

        input.focus();
        await element.updateComplete;
        input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
        await element.updateComplete;

        expect(changes).toEqual(["apple"]);
        expect(element.querySelector("[data-select-popover]")).toBeNull();
    });

    test("Escape closes the popover without firing change", async () => {
        const element = await mount();
        const input = element.querySelector<HTMLInputElement>("[data-select-input]")!;
        let changes = 0;
        element.addEventListener("change", () => {
            changes += 1;
        });

        input.focus();
        await element.updateComplete;
        input.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
        await element.updateComplete;

        expect(element.querySelector("[data-select-popover]")).toBeNull();
        expect(changes).toBe(0);
    });

    test("clicking an option commits the value", async () => {
        const element = await mount();
        const input = element.querySelector<HTMLInputElement>("[data-select-input]")!;
        input.focus();
        await element.updateComplete;

        const grape = [...element.querySelectorAll<HTMLButtonElement>("[data-select-option]")]
            .find((option) => option.textContent?.trim() === "Grape")!;
        grape.click();
        await element.updateComplete;

        expect(element.value).toBe("grape");
        expect(element.selectedOption?.label).toBe("Grape");
    });

    test("after committing, the input shows the selected label when popover is closed", async () => {
        const element = await mount();
        const input = element.querySelector<HTMLInputElement>("[data-select-input]")!;
        input.focus();
        await element.updateComplete;

        const apple = element.querySelector<HTMLButtonElement>("[data-select-option]")!;
        apple.click();
        await element.updateComplete;

        expect(input.value).toBe("Apple");
    });

    // The virtualizer resolves a row's index from its `data-index` attribute at
    // measure time. A row whose ref commits before that attribute is silently
    // dropped from measurement, so variable row heights stop working with no
    // failing assertion anywhere.
    test("rows carry data-index by the time the virtualizer measures them", async () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

        const element = await mount();
        const input = element.querySelector<HTMLInputElement>("[data-select-input]")!;
        input.focus();
        await element.updateComplete;

        expect(warn).not.toHaveBeenCalled();
        warn.mockRestore();
    });
});
