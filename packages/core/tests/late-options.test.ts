import { describe, expect, test } from "vitest";

import {
    MultiSelectBoxController,
    SingleSelectBoxController,
    type SelectOption,
} from "../src/index.js";

/**
 * A selection asked for before the option list could answer it.
 *
 * Fetching the options is the ordinary case, so the box exists before the list
 * does. A value handed in during that gap has to survive it: the controller
 * keeps what was asked for, not only what it could resolve at the time.
 */

const FRUITS: ReadonlyArray<SelectOption> = [
    { value: "pear", label: "Pear" },
    { value: "apple", label: "Apple" },
];

/** An empty list typed for the options that will replace it. */
const NONE: ReadonlyArray<SelectOption> = [];

describe("options that arrive after the value", () => {
    test("honours a value the owner set while the list was empty", () => {
        const controller = new SingleSelectBoxController({ options: NONE });
        controller.setValue("pear");
        expect(controller.getState().value).toBeNull();

        controller.setOptions(FRUITS);

        expect(controller.getState().value).toBe("pear");
    });

    test("honours the value the box was built with", () => {
        const controller = new SingleSelectBoxController({ options: NONE, defaultValue: "pear" });

        controller.setOptions(FRUITS);

        expect(controller.getState().value).toBe("pear");
    });

    test("honours every entry of a multi selection", () => {
        const controller = new MultiSelectBoxController({ options: NONE });
        controller.setValue(["pear", "apple"]);

        controller.setOptions(FRUITS);

        expect(controller.getState().value).toEqual(["pear", "apple"]);
    });

    test("does not bring back a selection the user cleared", () => {
        const controller = new SingleSelectBoxController({ options: FRUITS, defaultValue: "pear" });
        controller.clear();

        controller.setOptions(FRUITS);

        expect(controller.getState().value).toBeNull();
    });

    test("still drops a value whose option the new list does not offer", () => {
        const controller = new SingleSelectBoxController({ options: FRUITS, defaultValue: "pear" });

        controller.setOptions([{ value: "apple", label: "Apple" }]);

        expect(controller.getState().value).toBeNull();
    });
});
