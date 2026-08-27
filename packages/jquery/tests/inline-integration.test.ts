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

function chips(): HTMLButtonElement[] {
    return [...document.querySelectorAll<HTMLButtonElement>("#fruit [data-select-chip]")];
}

function pressedStates(): Array<string | null> {
    return chips().map((chip) => chip.getAttribute("aria-pressed"));
}

describe("$.fn.selectBox inline integration", () => {
    test("renders one chip per option and no popover", () => {
        jQuery("#fruit").selectBox({ surface: "inline", options: fruits });

        expect(chips()).toHaveLength(fruits.length);
        expect(document.querySelector("#fruit [data-select-popover]")).toBeNull();
        expect(document.querySelector("#fruit [data-select-input]")).toBeNull();
        expect(document.querySelector("#fruit [data-select-surface='inline']")).not.toBeNull();
    });

    test("single mode replaces selection on chip click", () => {
        const changes: Array<string | null> = [];
        jQuery("#fruit").on("change", (_event, value: string | null) => {
            changes.push(value);
        });
        jQuery("#fruit").selectBox({ surface: "inline", options: fruits });

        chips()[0]!.click();
        chips()[1]!.click();

        expect(changes).toEqual(["apple", "pear"]);
        expect(pressedStates()).toEqual(["false", "true", "false"]);
    });

    test("multi mode toggles selection on each chip click", () => {
        let lastValues: ReadonlyArray<string> | null = null;
        jQuery("#fruit").on("change", (_event, values: ReadonlyArray<string>) => {
            lastValues = values;
        });
        jQuery("#fruit").selectBox({ multiple: true, surface: "inline", options: fruits });

        chips()[0]!.click();
        chips()[2]!.click();

        expect(lastValues).toEqual(["apple", "grape"]);
        expect(pressedStates()).toEqual(["true", "false", "true"]);

        chips()[0]!.click();

        expect(lastValues).toEqual(["grape"]);
        expect(pressedStates()).toEqual(["false", "false", "true"]);
    });
});
