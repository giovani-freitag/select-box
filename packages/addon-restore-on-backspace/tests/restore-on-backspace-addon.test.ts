import {
    MultiSelectBoxController,
    SelectBoxKeyDispatcher,
    SingleSelectBoxController,
} from "@select-box/core";
import type { SelectOption } from "@select-box/core";
import { describe, expect, test } from "vitest";

import { RestoreOnBackspaceAddon } from "../src/restore-on-backspace-addon.js";

const fruits: ReadonlyArray<SelectOption> = [
    { value: "apple", label: "Apple" },
    { value: "pear", label: "Pear" },
    { value: "grape", label: "Grape" },
];

function multi(
    initialValue: ReadonlyArray<string>,
    addon = new RestoreOnBackspaceAddon(),
): {
    readonly controller: MultiSelectBoxController;
    readonly press: (key: string) => "handled" | "pass";
} {
    const controller = new MultiSelectBoxController({
        options: fruits,
        initialValue,
        addons: [addon],
    });
    const dispatcher = new SelectBoxKeyDispatcher(controller);
    return { controller, press: (key) => dispatcher.dispatch(key) };
}

describe("RestoreOnBackspaceAddon", () => {
    test("pops the last selection back into the query", () => {
        const { controller, press } = multi(["apple", "pear"]);
        controller.open();

        press("Backspace");

        expect(controller.getState().value).toEqual(["apple"]);
        expect(controller.getState().query).toBe("Pear");
    });

    test("claims the key, so the platform does not also act on it", () => {
        const { controller, press } = multi(["apple"]);
        controller.open();

        expect(press("Backspace")).toBe("handled");
    });

    test("keeps popping, one selection per press", () => {
        const { controller, press } = multi(["apple", "pear"]);
        controller.open();

        press("Backspace");
        controller.setQuery("");
        press("Backspace");

        expect(controller.getState().value).toEqual([]);
        expect(controller.getState().query).toBe("Apple");
    });

    test("stays out of the way while the user is typing", () => {
        const { controller, press } = multi(["apple"]);
        controller.open();
        controller.setQuery("gr");

        expect(press("Backspace")).toBe("pass");
        expect(controller.getState().value).toEqual(["apple"]);
    });

    test("does nothing when there is no selection to pop", () => {
        const { controller, press } = multi([]);
        controller.open();

        expect(press("Backspace")).toBe("pass");
        expect(controller.getState().query).toBe("");
    });

    test("only removes when configured to, leaving the query empty", () => {
        const { controller, press } = multi(
            ["apple", "pear"],
            new RestoreOnBackspaceAddon({ restoreAs: "remove" }),
        );
        controller.open();

        press("Backspace");

        expect(controller.getState().value).toEqual(["apple"]);
        expect(controller.getState().query).toBe("");
    });

    test("answers to a different key when asked", () => {
        const { controller, press } = multi(
            ["apple"],
            new RestoreOnBackspaceAddon({ key: "Delete" }),
        );
        controller.open();

        expect(press("Backspace")).toBe("pass");
        press("Delete");

        expect(controller.getState().value).toEqual([]);
    });

    test("leaves the other combobox keys alone", () => {
        const { controller, press } = multi(["apple"]);

        press("ArrowDown");

        expect(controller.getState().open).toBe(true);
        expect(controller.getState().value).toEqual(["apple"]);
    });

    test("publishes what the next press would pop", () => {
        const { controller } = multi(["apple", "pear"]);

        expect(controller.getState().addons["restore-on-backspace"].nextToRestore).toBe(
            "Pear",
        );
    });

    test("publishes nothing while the query is being typed", () => {
        const { controller } = multi(["apple"]);
        controller.open();
        controller.setQuery("gr");

        expect(
            controller.getState().addons["restore-on-backspace"].nextToRestore,
        ).toBeNull();
    });

    test("publishes nothing with an empty selection", () => {
        const { controller } = multi([]);

        expect(
            controller.getState().addons["restore-on-backspace"].nextToRestore,
        ).toBeNull();
    });

    test("works in single mode, where popping empties the selection", () => {
        const controller = new SingleSelectBoxController({
            options: fruits,
            initialValue: "pear",
            addons: [new RestoreOnBackspaceAddon()],
        });
        controller.open();

        new SelectBoxKeyDispatcher(controller).dispatch("Backspace");

        expect(controller.getState().value).toBeNull();
        expect(controller.getState().query).toBe("Pear");
    });

    test("refuses to pop on a read-only control", () => {
        const { controller, press } = multi(["apple"]);
        controller.setInteractivity({ disabled: false, readOnly: true });
        controller.open();

        press("Backspace");

        expect(controller.getState().value).toEqual(["apple"]);
    });
});
