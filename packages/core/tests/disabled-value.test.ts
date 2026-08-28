import { describe, expect, test } from "vitest";

import { MultiSelectBoxController, SingleSelectBoxController } from "../src/index.js";

/**
 * What a disabled option does to a value the owner sets.
 *
 * Disabling an option is a statement about the value, not only about the row:
 * it is refused wherever it arrives, including from the page. Documented
 * backwards once, so it is pinned here.
 */

const OPTIONS = [
    { value: "apple", label: "Apple" },
    { value: "pear", label: "Pear", disabled: true },
];

describe("a disabled option", () => {
    test("is dropped from a value the owner sets", () => {
        const controller = new SingleSelectBoxController({ options: OPTIONS });

        controller.setValue("pear");

        expect(controller.getState().value).toBeNull();
    });

    test("is dropped from the value the box is built with", () => {
        const controller = new SingleSelectBoxController({ options: OPTIONS, defaultValue: "pear" });

        expect(controller.getState().value).toBeNull();
    });

    test("leaves the enabled entries of a multi selection alone", () => {
        const controller = new MultiSelectBoxController({ options: OPTIONS });

        controller.setValue(["apple", "pear"]);

        expect(controller.getState().value).toEqual(["apple"]);
    });

    test("does not stand in the way of an enabled one", () => {
        const controller = new SingleSelectBoxController({ options: OPTIONS });

        controller.setValue("apple");

        expect(controller.getState().value).toBe("apple");
    });
});
