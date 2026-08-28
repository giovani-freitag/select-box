import { describe, expect, test } from "vitest";

import { defineSelectBoxElement, type SelectBox } from "../src/index.js";

/**
 * What has to survive being moved, reconfigured, or mounted on the other surface.
 *
 * A custom element cannot tell a reparent from a removal, and a reactive
 * property can flip at any point after mount. Both used to leave this element
 * in a state it could not come back from.
 */

defineSelectBoxElement("select-box-lifecycle");

const FRUITS = [
    { value: "pear", label: "Pear" },
    { value: "apple", label: "Apple" },
];

async function mount(configure: (element: SelectBox) => void = () => {}): Promise<SelectBox> {
    const element = document.createElement("select-box-lifecycle") as SelectBox;
    element.options = FRUITS;
    configure(element);
    document.body.append(element);
    await element.updateComplete;
    return element;
}

describe("moved to another parent", () => {
    test("still opens", async () => {
        const element = await mount();
        const destination = document.createElement("div");
        document.body.append(destination);

        destination.append(element);
        await element.updateComplete;
        element.controller!.open();
        await element.updateComplete;

        expect(element.controller!.getState().open).toBe(true);
    });

    test("comes back holding its selection", async () => {
        const element = await mount();
        element.controller!.setValue("pear");
        await element.updateComplete;
        const destination = document.createElement("div");
        document.body.append(destination);

        destination.append(element);
        await element.updateComplete;

        expect(element.controller!.getState().value).toBe("pear");
    });
});

describe("switched from the inline surface to the popover", () => {
    test("renders the list", async () => {
        const element = await mount((el) => {
            el.surface = "inline";
        });

        element.surface = "popover";
        await element.updateComplete;
        element.controller!.open();
        await element.updateComplete;

        expect(element.querySelectorAll("[data-select-option]")).toHaveLength(FRUITS.length);
    });
});

describe("given a new addons array", () => {
    test("keeps the selection", async () => {
        const element = await mount();
        element.controller!.setValue("pear");
        await element.updateComplete;

        element.addons = [];
        await element.updateComplete;

        expect(element.controller!.getState().value).toBe("pear");
    });

    test("detaches the addons it is replacing", async () => {
        let attached = 0;
        let detached = 0;
        const probe = {
            name: "probe",
            attach: (): void => {
                attached += 1;
            },
            detach: (): void => {
                detached += 1;
            },
        };
        const element = await mount((el) => {
            el.addons = [probe];
        });

        element.addons = [probe];
        await element.updateComplete;

        expect({ attached, detached }).toEqual({ attached: 2, detached: 1 });
    });
});
