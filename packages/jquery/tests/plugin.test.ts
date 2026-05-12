import jQuery from "jquery";
import { beforeEach, describe, expect, test } from "vitest";

import { packageName } from "../src/index.js";

interface FruitExtra {
    readonly id: number;
    readonly name: string;
}

const fruits = [
    { value: "apple", label: "Apple", group: "Pomes", id: 1, name: "apple" },
    { value: "pear", label: "Pear", group: "Pomes", id: 2, name: "pear" },
    { value: "lemon", label: "Lemon", id: 3, name: "lemon" },
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
        jQuery("#fruit").selectBox<FruitExtra>({ options: fruits, placeholder: "Pick a fruit" });

        const trigger = document.querySelector<HTMLButtonElement>("#fruit [data-select-trigger]");
        const value = document.querySelector("#fruit .select-box-value");

        expect(trigger).not.toBeNull();
        expect(value?.textContent).toBe("Pick a fruit");
    });

    test("calling open() shows the popover and lists every option", () => {
        jQuery("#fruit").selectBox<FruitExtra>({ options: fruits });
        jQuery("#fruit").selectBox("open");

        const popover = document.querySelector<HTMLDivElement>("#fruit [data-select-popover]");
        const options = [...document.querySelectorAll("#fruit [data-select-option]")].map(
            (option) => option.textContent,
        );

        expect(popover?.hidden).toBe(false);
        expect(options).toEqual(["Apple", "Pear", "Lemon"]);
    });

    test("committing an option triggers the change event with the new value and option", () => {
        jQuery("#fruit").selectBox<FruitExtra>({ options: fruits });
        const events: Array<{ value: string | null; name: string | undefined }> = [];
        jQuery("#fruit").on(
            "change",
            (_event, value: string | null, option: (FruitExtra & { value: string; label: string }) | null) => {
                events.push({ value, name: option?.name });
            },
        );
        jQuery("#fruit").selectBox("open");

        const firstOption = document.querySelector<HTMLButtonElement>("#fruit [data-select-option]");
        firstOption?.click();

        expect(events).toHaveLength(1);
        expect(events[0]?.value).toBe("apple");
        expect(events[0]?.name).toBe("apple");
    });

    test("destroy() tears the rendered select box down", () => {
        jQuery("#fruit").selectBox<FruitExtra>({ options: fruits });
        jQuery("#fruit").selectBox("destroy");

        expect(document.querySelector("#fruit [data-select-trigger]")).toBeNull();
    });
});
