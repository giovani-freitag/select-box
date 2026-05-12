import jQuery from "jquery";
import { beforeEach, describe, expect, test } from "vitest";

import { packageName } from "../src/index.js";

interface Fruit {
    readonly id: number;
    readonly name: string;
}

const fruits = [
    { value: { id: 1, name: "apple" }, label: "Apple", group: "Pomes" },
    { value: { id: 2, name: "pear" }, label: "Pear", group: "Pomes" },
    { value: { id: 3, name: "lemon" }, label: "Lemon" },
];

beforeEach(() => {
    document.body.innerHTML = `<div id="fruit"></div>`;
});

describe("$.fn.selectBox", () => {
    test("exports the package name and registers the plugin on import", () => {
        expect(packageName).toBe("@select-box/jquery");
        expect(typeof jQuery.fn.selectBox).toBe("function");
    });

    test("initialising on a host element renders the trigger with the placeholder", () => {
        jQuery("#fruit").selectBox<Fruit>({ options: fruits, placeholder: "Pick a fruit" });

        const trigger = document.querySelector<HTMLButtonElement>("#fruit [data-select-trigger]");
        const value = document.querySelector("#fruit .select-box-value");

        expect(trigger).not.toBeNull();
        expect(value?.textContent).toBe("Pick a fruit");
    });

    test("calling open() shows the popover and lists every option", () => {
        jQuery("#fruit").selectBox<Fruit>({ options: fruits });
        jQuery("#fruit").selectBox("open");

        const popover = document.querySelector<HTMLDivElement>("#fruit [data-select-popover]");
        const options = [...document.querySelectorAll("#fruit [data-select-option]")].map(
            (option) => option.textContent,
        );

        expect(popover?.hidden).toBe(false);
        expect(options).toEqual(["Apple", "Pear", "Lemon"]);
    });

    test("committing an option triggers the change event with the new value", () => {
        jQuery("#fruit").selectBox<Fruit>({ options: fruits });
        const events: Array<Fruit | null> = [];
        jQuery("#fruit").on("change", (_event, value: Fruit | null) => {
            events.push(value);
        });
        jQuery("#fruit").selectBox("open");

        const firstOption = document.querySelector<HTMLButtonElement>("#fruit [data-select-option]");
        firstOption?.click();

        expect(events).toHaveLength(1);
        expect(events[0]?.name).toBe("apple");
    });

    test("destroy() tears the rendered select box down", () => {
        jQuery("#fruit").selectBox<Fruit>({ options: fruits });
        jQuery("#fruit").selectBox("destroy");

        expect(document.querySelector("#fruit [data-select-trigger]")).toBeNull();
    });
});
