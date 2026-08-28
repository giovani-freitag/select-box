import { describe, expect, test } from "vitest";

import { SingleSelectBoxController, type SelectBoxAddon } from "../src/index.js";

/**
 * An addon gate still in flight when the owner changes the control underneath it.
 *
 * `interceptOpen` may answer asynchronously, and the answer arrives into a
 * controller that has moved on. Anything that closed the popover from the owner
 * side has to call the gate off, or its late "yes" reopens a control that is by
 * then disabled, or just reset.
 */

const FRUITS = [
    { value: "pear", label: "Pear" },
    { value: "apple", label: "Apple" },
];

/** An addon whose open gate stays unanswered until the test says so. */
function deferredGate(): { addon: SelectBoxAddon; allow: () => void } {
    let allow = (): void => {};
    const addon: SelectBoxAddon = {
        name: "deferred-gate",
        interceptOpen: () =>
            new Promise<boolean>((resolve) => {
                allow = () => resolve(true);
            }),
    };
    return { addon, allow: () => allow() };
}

/** Lets the resolved gate reach the controller. */
async function settle(): Promise<void> {
    await Promise.resolve();
    await Promise.resolve();
}

describe("a gate that answers late", () => {
    test("cannot open a control that was disabled while it waited", async () => {
        const gate = deferredGate();
        const controller = new SingleSelectBoxController({ options: FRUITS, addons: [gate.addon] });
        controller.open();
        controller.setInteractivity({ disabled: true });

        gate.allow();
        await settle();

        expect(controller.getState().open).toBe(false);
    });

    test("cannot open a control that was reset while it waited", async () => {
        const gate = deferredGate();
        const controller = new SingleSelectBoxController({ options: FRUITS, addons: [gate.addon] });
        controller.open();
        controller.reset();

        gate.allow();
        await settle();

        expect(controller.getState().open).toBe(false);
    });

    test("still opens when nothing interrupted it", async () => {
        const gate = deferredGate();
        const controller = new SingleSelectBoxController({ options: FRUITS, addons: [gate.addon] });
        controller.open();

        gate.allow();
        await settle();

        expect(controller.getState().open).toBe(true);
    });
});
