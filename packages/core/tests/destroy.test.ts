import { describe, expect, test, vi } from "vitest";

import { SingleSelectBoxController } from "../src/index.js";

const FRUITS = [
    { value: "apple", label: "Apple" },
    { value: "pear", label: "Pear" },
];

describe("SelectBoxController teardown", () => {
    test("stops notifying subscribers that never unsubscribed", () => {
        const controller = new SingleSelectBoxController({ options: FRUITS });
        const listener = vi.fn();
        controller.subscribe(listener);

        controller.destroy();
        controller.open();
        controller.setQuery("ap");

        expect(listener).not.toHaveBeenCalled();
    });

    test("leaves the published snapshot untouched by later calls", () => {
        const controller = new SingleSelectBoxController({ options: FRUITS });
        const before = controller.getState();

        controller.destroy();
        controller.open();
        controller.commitValue("apple");

        expect(controller.getState()).toBe(before);
    });

    test("detaches every addon exactly once across repeated calls", () => {
        const detach = vi.fn();
        const controller = new SingleSelectBoxController({ options: FRUITS });
        controller.use({ name: "probe", detach });

        controller.destroy();
        controller.destroy();

        expect(detach).toHaveBeenCalledTimes(1);
    });

    test("refuses to register an addon once torn down", () => {
        const attach = vi.fn();
        const controller = new SingleSelectBoxController({ options: FRUITS });

        controller.destroy();
        controller.use({ name: "late", attach });

        expect(attach).not.toHaveBeenCalled();
    });
});
