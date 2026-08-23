import jQuery from "jquery";
import { beforeEach, describe, expect, test } from "vitest";

import "../src/index.js";

const fruits = [
    { value: "apple", label: "Apple" },
    { value: "pear", label: "Pear" },
    { value: "grape", label: "Grape" },
];

beforeEach(() => {
    document.body.innerHTML = `<div id="fruit"></div>`;
});

function getInput(): HTMLInputElement {
    return document.querySelector<HTMLInputElement>("#fruit [data-select-input]")!;
}

function popoverHidden(): boolean | undefined {
    return document.querySelector<HTMLDivElement>("#fruit [data-select-popover]")?.hidden;
}

function caret(): HTMLButtonElement | null {
    return document.querySelector<HTMLButtonElement>("#fruit .select-box-caret");
}

function clearButton(): HTMLButtonElement | null {
    return document.querySelector<HTMLButtonElement>("#fruit [data-select-clear]");
}

describe("$.fn.selectBox integration", () => {
    test("renders the caret and leaves the clear button out of the tree", () => {
        jQuery("#fruit").selectBox({ options: fruits, placeholder: "Pick a fruit" });

        expect(caret()).not.toBeNull();
        expect(clearButton()).toBeNull();
    });

    test("focusing the trigger input opens the popover", () => {
        jQuery("#fruit").selectBox({ options: fruits, placeholder: "Pick a fruit" });
        const input = getInput();

        input.focus();

        expect(popoverHidden()).toBe(false);
    });

    test("typing into the input filters the option list", () => {
        jQuery("#fruit").selectBox({ options: fruits });
        const input = getInput();
        input.focus();

        input.value = "ear";
        input.dispatchEvent(new Event("input", { bubbles: true }));

        const labels = [...document.querySelectorAll("#fruit [data-select-option]")].map(
            (option) => option.textContent,
        );
        expect(labels).toEqual(["Pear"]);
    });

    test("Enter commits the active option, fires change, and closes the popover", () => {
        jQuery("#fruit").selectBox({ options: fruits });
        const events: Array<string | null> = [];
        jQuery("#fruit").on("change", (_event, value: string | null) => events.push(value));
        const input = getInput();

        input.focus();
        input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));

        expect(events).toEqual(["apple"]);
        expect(popoverHidden()).toBe(true);
    });

    test("Escape closes the popover without firing change", () => {
        jQuery("#fruit").selectBox({ options: fruits });
        let changes = 0;
        jQuery("#fruit").on("change", () => {
            changes += 1;
        });
        const input = getInput();

        input.focus();
        input.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));

        expect(popoverHidden()).toBe(true);
        expect(changes).toBe(0);
    });

    test("clicking outside the host closes the popover", () => {
        jQuery("#fruit").selectBox({ options: fruits });
        const input = getInput();
        input.focus();
        expect(popoverHidden()).toBe(false);

        document.body.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));

        expect(popoverHidden()).toBe(true);
    });

    test("after committing, the input shows the selected option label", () => {
        jQuery("#fruit").selectBox({ options: fruits });
        const input = getInput();
        input.focus();

        const grape = [...document.querySelectorAll<HTMLButtonElement>("#fruit [data-select-option]")]
            .find((option) => option.textContent === "Grape")!;
        grape.click();

        expect(input.value).toBe("Grape");
    });
});
