import jQuery from "jquery";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
    EmptySelectionError,
    LegacyMethodCallError,
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

    test("toggle() opens a closed box and closes an open one", () => {
        const box = jQuery("#fruit").selectBox<FruitExtra>({ options: fruits });
        const popover = () =>
            document.querySelector<HTMLDivElement>("#fruit [data-select-popover]")!.hidden;

        box.toggle();
        expect(popover()).toBe(false);

        box.toggle();
        expect(popover()).toBe(true);
    });

    test("clear() drops the selection and repaints the trigger", () => {
        const box = jQuery("#fruit").selectBox<FruitExtra>({
            options: fruits,
            defaultValue: "pear",
        });

        box.clear();

        expect(box.controller.getState().value).toBeNull();
        expect(
            document.querySelector<HTMLInputElement>("#fruit [data-select-input]")?.value,
        ).toBe("");
    });

    test("clear() empties every chip in multi mode", () => {
        const box = jQuery("#fruit").selectBox<FruitExtra>({
            multiple: true,
            options: fruits,
            defaultValue: ["apple", "pear"],
        });

        box.clear();

        expect(document.querySelectorAll("#fruit [data-select-chip]")).toHaveLength(0);
    });

    test("takes over the host, discarding whatever it was rendering", () => {
        document.body.innerHTML = `<div id="fruit">Loading fruits…</div>`;

        jQuery("#fruit").selectBox<FruitExtra>({ options: fruits });

        const host = document.querySelector<HTMLElement>("#fruit")!;
        expect(host.textContent).not.toContain("Loading fruits…");
        expect(host.children).toHaveLength(1);
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

    test("marks only the elements it mounted, never their neighbours", () => {
        document.body.innerHTML = `<div id="fruit"></div><div id="veg"></div>`;

        jQuery("#fruit").selectBox<FruitExtra>({ options: fruits });

        expect(document.querySelector<HTMLElement>("#fruit")!.selectBox).toBeDefined();
        expect(document.querySelector<HTMLElement>("#veg")!.selectBox).toBeUndefined();
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

describe("form participation", () => {
    function formWith(name: string | undefined): HTMLFormElement {
        document.body.innerHTML = `<form id="host-form"><div id="fruit"></div></form>`;
        void name;
        return document.querySelector<HTMLFormElement>("#host-form")!;
    }

    test("resetting the form clears the selection, not just the native controls", () => {
        const form = formWith("fruit");
        const box = jQuery("#fruit").selectBox<FruitExtra>({ options: fruits, name: "fruit" });
        box.controller.commitValue("pear");

        form.reset();

        expect(box.controller.getState().value).toBeNull();
    });

    test("the reset repaints, so a stale label cannot come back", () => {
        const form = formWith("fruit");
        const box = jQuery("#fruit").selectBox<FruitExtra>({ options: fruits, name: "fruit" });
        box.controller.commitValue("pear");

        form.reset();
        box.open();
        box.close();

        expect(
            document.querySelector<HTMLInputElement>("#fruit [data-select-input]")?.value,
        ).toBe("");
    });

    test("resetting a different form leaves this one alone", () => {
        document.body.innerHTML = `
            <form id="host-form"><div id="fruit"></div></form>
            <form id="other"><input name="unrelated" /></form>
        `;
        const box = jQuery("#fruit").selectBox<FruitExtra>({ options: fruits, name: "fruit" });
        box.controller.commitValue("pear");

        document.querySelector<HTMLFormElement>("#other")!.reset();

        expect(box.controller.getState().value).toBe("pear");
    });

    test("a nameless box stays out of the form and ignores its resets", () => {
        const form = formWith(undefined);
        const box = jQuery("#fruit").selectBox<FruitExtra>({ options: fruits });
        box.controller.commitValue("pear");

        form.reset();

        expect(document.querySelector("[data-select-form-mirror]")).toBeNull();
        expect(box.controller.getState().value).toBe("pear");
    });

    test("a destroyed box stops answering form resets", () => {
        const form = formWith("fruit");
        const box = jQuery("#fruit").selectBox<FruitExtra>({ options: fruits, name: "fruit" });
        box.controller.commitValue("pear");
        const controller = box.controller;
        box.destroy();

        form.reset();

        expect(controller.getState().value).toBe("pear");
    });

    test("restores the initial value, the way a native select does", () => {
        const form = formWith("fruit");
        const box = jQuery("#fruit").selectBox<FruitExtra>({
            options: fruits,
            name: "fruit",
            defaultValue: "apple",
        });
        box.controller.commitValue("pear");

        form.reset();

        expect(box.controller.getState().value).toBe("apple");
        expect(
            document.querySelector<HTMLInputElement>("#fruit [data-select-input]")?.value,
        ).toBe("Apple");
    });

    test("submits the restored default after a reset", () => {
        const form = formWith("fruit");
        const box = jQuery("#fruit").selectBox<FruitExtra>({
            options: fruits,
            name: "fruit",
            defaultValue: "apple",
        });
        box.controller.commitValue("pear");

        form.reset();

        expect([...new FormData(form).entries()]).toEqual([["fruit", "apple"]]);
    });
});

describe("document listeners", () => {
    /**
     * The view reaches the document for two things a local listener cannot see:
     * a click outside the popover, and a form reset it may not be attached for
     * yet. Both have to come off on teardown, and neither leak is visible
     * through behaviour — a destroyed view's listeners are inert because its
     * markup is gone — so the balance is what gets asserted.
     */
    function recordDocumentListeners(): {
        readonly added: string[];
        readonly removed: string[];
    } {
        const added: string[] = [];
        const removed: string[] = [];
        const originalAdd = document.addEventListener.bind(document);
        const originalRemove = document.removeEventListener.bind(document);
        vi.spyOn(document, "addEventListener").mockImplementation(
            ((type: string, ...rest: unknown[]) => {
                added.push(type);
                return (originalAdd as (...args: unknown[]) => void)(type, ...rest);
            }) as typeof document.addEventListener,
        );
        vi.spyOn(document, "removeEventListener").mockImplementation(
            ((type: string, ...rest: unknown[]) => {
                removed.push(type);
                return (originalRemove as (...args: unknown[]) => void)(type, ...rest);
            }) as typeof document.removeEventListener,
        );
        return { added, removed };
    }

    afterEach(() => {
        vi.restoreAllMocks();
    });

    test("a mount and destroy cycle leaves nothing on the document", () => {
        document.body.innerHTML = `<form id="host-form"><div id="fruit"></div></form>`;
        const log = recordDocumentListeners();

        jQuery("#fruit")
            .selectBox<FruitExtra>({ options: fruits, name: "fruit" })
            .destroy();

        expect(log.added.length).toBeGreaterThan(0);
        expect([...log.removed].sort()).toEqual([...log.added].sort());
    });

    test("re-initialising does not stack listeners", () => {
        document.body.innerHTML = `<form id="host-form"><div id="fruit"></div></form>`;
        const log = recordDocumentListeners();

        jQuery("#fruit").selectBox<FruitExtra>({ options: fruits, name: "fruit" });
        jQuery("#fruit").selectBox<FruitExtra>({ options: fruits, name: "fruit" });

        const live = log.added.length - log.removed.length;
        expect(live).toBe(log.added.length / 2);
    });

    test("a nameless box never reaches the document for a reset", () => {
        const log = recordDocumentListeners();

        jQuery("#fruit").selectBox<FruitExtra>({ options: fruits });

        expect(log.added).not.toContain("reset");
    });
});

describe("legacy method-string calls", () => {
    test("refuse loudly instead of mounting an empty box over the live one", () => {
        const box = jQuery("#fruit").selectBox<FruitExtra>({ options: fruits });
        box.controller.commitValue("pear");

        expect(() =>
            (jQuery("#fruit").selectBox as unknown as (method: string) => void)("open"),
        ).toThrow(LegacyMethodCallError);
        expect(box.controller.getState().value).toBe("pear");
        expect(document.querySelector<HTMLElement>("#fruit")!.selectBox).toBe(box);
    });

    test("name the method that moved, so the message is actionable", () => {
        jQuery("#fruit").selectBox<FruitExtra>({ options: fruits });

        expect(() =>
            (jQuery("#fruit").selectBox as unknown as (method: string) => void)("destroy"),
        ).toThrow(/\.destroy\(\)/);
    });
});

describe("the form mirror's reset baseline", () => {
    function defaults(): ReadonlyArray<string> {
        const mirror = document.querySelector<HTMLSelectElement>(
            "#fruit [data-select-form-mirror]",
        )!;
        return [...mirror.options]
            .filter((option) => option.defaultSelected)
            .map((option) => option.value);
    }

    /**
     * The browser resets the mirror to its attribute-defined default, so that
     * default has to track what the widget holds — otherwise a reset lands on the
     * empty option while the controller restores its own default.
     */
    test("marks the current selection as the default", () => {
        document.body.innerHTML = `<form id="host-form"><div id="fruit"></div></form>`;
        jQuery("#fruit").selectBox<FruitExtra>({
            options: fruits,
            name: "fruit",
            defaultValue: "apple",
        });

        expect(defaults()).toEqual(["apple"]);
    });

    test("follows the selection as it moves", () => {
        document.body.innerHTML = `<form id="host-form"><div id="fruit"></div></form>`;
        const box = jQuery("#fruit").selectBox<FruitExtra>({
            options: fruits,
            name: "fruit",
            defaultValue: "apple",
        });

        box.controller.commitValue("pear");

        expect(defaults()).toEqual(["pear"]);
    });

    test("survives an option list replaced at runtime", () => {
        document.body.innerHTML = `<form id="host-form"><div id="fruit"></div></form>`;
        const box = jQuery("#fruit").selectBox<FruitExtra>({
            options: fruits,
            name: "fruit",
            defaultValue: "apple",
        });

        box.setOptions([
            { value: "apple", label: "Apple", group: "Pomes", id: 1, name: "apple" },
            { value: "fig", label: "Fig", id: 9, name: "fig" },
        ]);

        expect(defaults()).toEqual(["apple"]);
    });

    test("keeps the trigger text as its own reset baseline", () => {
        document.body.innerHTML = `<form id="host-form"><div id="fruit"></div></form>`;
        jQuery("#fruit").selectBox<FruitExtra>({
            options: fruits,
            name: "fruit",
            defaultValue: "apple",
        });

        expect(
            document.querySelector<HTMLInputElement>("#fruit [data-select-input]")
                ?.defaultValue,
        ).toBe("Apple");
    });
});

describe("accessible naming", () => {
    test("forwards the accessible name a consumer configured", () => {
        jQuery("#fruit").selectBox<FruitExtra>({
            options: fruits,
            ariaLabel: "Favourite fruit",
        });

        expect(
            document
                .querySelector("#fruit [role='combobox']")
                ?.getAttribute("aria-label"),
        ).toBe("Favourite fruit");
    });

    test("forwards a labelledby reference instead", () => {
        document.body.innerHTML = `<span id="fruit-label">Fruit</span><div id="fruit"></div>`;
        jQuery("#fruit").selectBox<FruitExtra>({
            options: fruits,
            ariaLabelledby: "fruit-label",
        });

        expect(
            document
                .querySelector("#fruit [role='combobox']")
                ?.getAttribute("aria-labelledby"),
        ).toBe("fruit-label");
    });
});
