import { beforeAll, describe, expect, test } from "vitest";

import { defineSelectBoxElement, type SelectBoxElement } from "../src/index.js";


/**
 * What has to survive being moved.
 *
 * A custom element cannot tell a reparent from a removal: the platform fires
 * disconnect then connect either way. Rebuilding from the markup seed alone
 * dropped whatever the user had picked.
 */

beforeAll(() => defineSelectBoxElement());

const FRUITS = [
    { value: "pear", label: "Pear" },
    { value: "apple", label: "Apple" },
];

function mount(): SelectBoxElement {
    const element = document.createElement("select-box");
    element.options = FRUITS;
    document.body.append(element);
    return element;
}

describe("moved to another parent", () => {
    test("still opens", () => {
        const element = mount();
        const destination = document.createElement("div");
        document.body.append(destination);

        destination.append(element);
        element.controller!.open();

        expect(element.controller!.getState().open).toBe(true);
    });

    test("comes back holding its selection", () => {
        const element = mount();
        element.controller!.setValue("pear");
        const destination = document.createElement("div");
        document.body.append(destination);

        destination.append(element);

        expect(element.controller!.getState().value).toBe("pear");
    });
});
