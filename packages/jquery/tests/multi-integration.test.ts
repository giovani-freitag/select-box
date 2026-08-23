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

function chipLabels(): string[] {
    return [...document.querySelectorAll("#fruit [data-select-chip]")].map((chip) =>
        chip.textContent.replace("×", "").trim(),
    );
}

function caret(): HTMLButtonElement | null {
    return document.querySelector<HTMLButtonElement>("#fruit .select-box-caret");
}

function clearButton(): HTMLButtonElement | null {
    return document.querySelector<HTMLButtonElement>("#fruit [data-select-clear]");
}

function commitOption(label: string): void {
    const option = [...document.querySelectorAll<HTMLButtonElement>(
        "#fruit [data-select-option]",
    )].find((candidate) => candidate.textContent?.includes(label))!;
    option.click();
}

describe("$.fn.selectBox multi integration", () => {
    test("renders with mode='multi' when configured", () => {
        jQuery("#fruit").selectBox({
            mode: "multi",
            options: fruits,
            placeholder: "Pick fruits",
        });

        expect(document.querySelector("#fruit [data-select-mode='multi']")).not.toBeNull();
    });

    test("clicking an option commits as a chip and keeps the popover open", () => {
        jQuery("#fruit").selectBox({ mode: "multi", options: fruits });
        const input = getInput();
        input.focus();

        const appleButton = [...document.querySelectorAll<HTMLButtonElement>(
            "#fruit [data-select-option]",
        )].find((option) => option.textContent?.includes("Apple"))!;
        appleButton.click();

        expect(chipLabels()).toEqual(["Apple"]);
        expect(document.querySelector<HTMLDivElement>("#fruit [data-select-popover]")?.hidden).toBe(false);
    });

    test("fires the selectbox:change event with values + options", () => {
        let lastValues: ReadonlyArray<string> | null = null;
        jQuery("#fruit").on("selectbox:change", (_event, values: ReadonlyArray<string>) => {
            lastValues = values;
        });
        jQuery("#fruit").selectBox({ mode: "multi", options: fruits });
        const input = getInput();
        input.focus();

        const pearButton = [...document.querySelectorAll<HTMLButtonElement>(
            "#fruit [data-select-option]",
        )].find((option) => option.textContent?.includes("Pear"))!;
        pearButton.click();

        expect(lastValues).toEqual(["pear"]);
    });

    test("leaves the caret out of the tree and holds the clear button until a chip exists", () => {
        jQuery("#fruit").selectBox({ mode: "multi", options: fruits });
        getInput().focus();

        commitOption("Apple");

        expect(caret()).toBeNull();
        expect(clearButton()).not.toBeNull();
    });

    test("renders no clear button while the selection is empty", () => {
        jQuery("#fruit").selectBox({ mode: "multi", options: fruits });

        expect(clearButton()).toBeNull();
    });

    test("clicking the clear button empties the selection and drops the button again", () => {
        jQuery("#fruit").selectBox({ mode: "multi", options: fruits, initialValue: ["apple"] });

        clearButton()!.click();

        expect(chipLabels()).toEqual([]);
        expect(clearButton()).toBeNull();
    });

    test("setMode('single') brings the caret back and drops the clear button", () => {
        jQuery("#fruit").selectBox({ mode: "multi", options: fruits, initialValue: ["apple"] });

        jQuery("#fruit").selectBox("setMode", "single");

        expect(caret()).not.toBeNull();
        expect(clearButton()).toBeNull();
    });

    test("setMode('single') preserves the first selected option", () => {
        jQuery("#fruit").selectBox({
            mode: "multi",
            options: fruits,
            initialValue: ["pear", "apple"],
        });

        expect(chipLabels()).toEqual(["Pear", "Apple"]);

        jQuery("#fruit").selectBox("setMode", "single");

        expect(document.querySelector("#fruit [data-select-mode='single']")).not.toBeNull();
        expect(chipLabels()).toEqual([]);
        const input = getInput();
        expect(input.value).toBe("Pear");
    });

    test("setMode('multi') wraps the held value as a singleton chip", () => {
        jQuery("#fruit").selectBox({
            options: fruits,
            initialValue: "apple",
        });

        jQuery("#fruit").selectBox("setMode", "multi");

        expect(document.querySelector("#fruit [data-select-mode='multi']")).not.toBeNull();
        expect(chipLabels()).toEqual(["Apple"]);
    });

    test("setMode is a no-op when already in the requested mode", () => {
        jQuery("#fruit").selectBox({ mode: "multi", options: fruits, initialValue: ["apple"] });

        jQuery("#fruit").selectBox("setMode", "multi");

        expect(chipLabels()).toEqual(["Apple"]);
    });
});
