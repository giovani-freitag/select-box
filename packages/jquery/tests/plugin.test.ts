import jQuery from "jquery";
import { beforeEach, describe, expect, test, vi } from "vitest";

import {
    EmptySelectionError,
    packageName,
    SelectBoxView,
} from "../src/index.js";

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

    test("initialising on a host element renders the trigger input with the placeholder", () => {
        jQuery("#fruit").selectBox<FruitExtra>({ options: fruits, placeholder: "Pick a fruit" });

        const trigger = document.querySelector<HTMLDivElement>("#fruit [data-select-trigger]");
        const input = document.querySelector<HTMLInputElement>("#fruit [data-select-input]");

        expect(trigger).not.toBeNull();
        expect(input).not.toBeNull();
        expect(input?.placeholder).toBe("Pick a fruit");
        expect(input?.value).toBe("");
    });

    test("calling open() shows the popover and lists every option", () => {
        jQuery("#fruit").selectBox<FruitExtra>({ options: fruits }).open();

        const popover = document.querySelector<HTMLDivElement>("#fruit [data-select-popover]");
        const options = [...document.querySelectorAll("#fruit [data-select-option]")].map(
            (option) => option.textContent,
        );

        expect(popover?.hidden).toBe(false);
        expect(options).toEqual(["Apple", "Pear", "Lemon"]);
    });

    test("committing an option triggers the change event with the new value and option", () => {
        const box = jQuery("#fruit").selectBox<FruitExtra>({ options: fruits });
        const events: Array<{ value: string | null; name: string | undefined }> = [];
        jQuery("#fruit").on(
            "change",
            (_event, value: string | null, option: (FruitExtra & { value: string; label: string }) | null) => {
                events.push({ value, name: option?.name });
            },
        );
        box.open();

        const firstOption = document.querySelector<HTMLButtonElement>("#fruit [data-select-option]");
        firstOption?.click();

        expect(events).toHaveLength(1);
        expect(events[0]?.value).toBe("apple");
        expect(events[0]?.name).toBe("apple");
    });

    test("destroy() tears the rendered select box down", () => {
        jQuery("#fruit").selectBox<FruitExtra>({ options: fruits }).destroy();

        expect(document.querySelector("#fruit [data-select-trigger]")).toBeNull();
    });
});

describe("the instance the plugin hands back", () => {
    test("initialising returns the view, not the jQuery collection", () => {
        const box = jQuery("#fruit").selectBox<FruitExtra>({ options: fruits });

        expect(box.root).toBe(document.querySelector("#fruit [data-select-root]"));
        expect(box.controller.getState().mode).toBe("single");
    });

    test("drives the component through its own methods", () => {
        const box = jQuery("#fruit").selectBox<FruitExtra>({ options: fruits });

        box.open();
        expect(document.querySelector<HTMLDivElement>("#fruit [data-select-popover]")?.hidden)
            .toBe(false);

        box.close();
        expect(document.querySelector<HTMLDivElement>("#fruit [data-select-popover]")?.hidden)
            .toBe(true);
    });

    test("replaces the option list at runtime", () => {
        const box = jQuery("#fruit").selectBox<FruitExtra>({ options: fruits });
        box.open();

        box.setOptions([{ value: "fig", label: "Fig", id: 9, name: "fig" }]);

        expect(
            [...document.querySelectorAll("#fruit [data-select-option]")].map(
                (option) => option.textContent,
            ),
        ).toEqual(["Fig"]);
    });

    test("hands over the same controller the component renders from", () => {
        const box = jQuery("#fruit").selectBox<FruitExtra>({ options: fruits });

        box.controller.commitValue("pear");

        expect(
            document.querySelector<HTMLInputElement>("#fruit [data-select-input]")?.value,
        ).toBe("Pear");
    });

    test("refuses an empty collection instead of returning nothing", () => {
        expect(() => jQuery("#nowhere").selectBox({ options: fruits })).toThrow(
            EmptySelectionError,
        );
    });

    test("builds one view per element and returns the first", () => {
        document.body.innerHTML = `<div class="host"></div><div class="host"></div>`;
        const hosts = [...document.querySelectorAll<HTMLElement>(".host")];

        const box = jQuery(".host").selectBox({ options: fruits });

        expect(box).toBe(hosts[0]!.selectBox);
        expect(hosts[1]!.selectBox).toBeDefined();
        expect(hosts[1]!.selectBox).not.toBe(box);
    });
});

describe("reaching the instance through the element", () => {
    test("the element carries the view, Selectize-style", () => {
        const box = jQuery("#fruit").selectBox<FruitExtra>({ options: fruits });

        expect(document.querySelector<HTMLElement>("#fruit")!.selectBox).toBe(box);
    });

    test("jQuery's prop() reaches the same instance", () => {
        const box = jQuery("#fruit").selectBox<FruitExtra>({ options: fruits });

        const reached = jQuery("#fruit").prop("selectBox") as SelectBoxView<FruitExtra>;

        expect(reached).toBe(box);
        reached.open();
        expect(box.controller.getState().open).toBe(true);
    });

    test("an element with no select box advertises none", () => {
        expect(document.querySelector<HTMLElement>("#fruit")!.selectBox).toBeUndefined();
    });

    test("destroying through the instance clears the element property", () => {
        const box = jQuery("#fruit").selectBox<FruitExtra>({ options: fruits });

        box.destroy();

        expect(document.querySelector<HTMLElement>("#fruit")!.selectBox).toBeUndefined();
    });

    test("re-initialising swaps the advertised instance for the new one", () => {
        const first = jQuery("#fruit").selectBox<FruitExtra>({ options: fruits });

        const second = jQuery("#fruit").selectBox<FruitExtra>({ options: fruits });

        expect(second).not.toBe(first);
        expect(document.querySelector<HTMLElement>("#fruit")!.selectBox).toBe(second);
        expect(document.querySelectorAll("#fruit [data-select-root]")).toHaveLength(1);
    });

    test("destroying twice is harmless and notifies the owner once", () => {
        const onDestroy = vi.fn();
        const view = new SelectBoxView<FruitExtra>({ options: fruits, onDestroy });
        view.destroy();

        expect(() => view.destroy()).not.toThrow();
        expect(onDestroy).toHaveBeenCalledTimes(1);
    });

    test("re-initialising tears the previous instance down, not just its markup", () => {
        const detach = vi.fn();
        jQuery("#fruit").selectBox<FruitExtra>({
            options: fruits,
            addons: [{ name: "probe", detach }],
        });

        jQuery("#fruit").selectBox<FruitExtra>({ options: fruits });

        expect(detach).toHaveBeenCalledTimes(1);
    });
});
