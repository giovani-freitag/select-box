import { LitElement } from "lit";
import { describe, expect, test } from "vitest";

import { packageName, SelectBoxController } from "../src/index.js";

class TestHost extends LitElement {
    selectBox = new SelectBoxController<string>(this, {
        options: [
            { value: "a", label: "Apple" },
            { value: "b", label: "Banana" },
        ],
    });
}

customElements.define("test-host", TestHost);

describe("@select-box/lit", () => {
    test("exports the controller class and the package name", () => {
        expect(packageName).toBe("@select-box/lit");
        expect(typeof SelectBoxController).toBe("function");
    });

    test("ReactiveController exposes the initial snapshot through state", () => {
        const element = document.createElement("test-host") as TestHost;
        document.body.append(element);

        expect(element.selectBox.state.value).toBeNull();
        expect(element.selectBox.state.open).toBe(false);
        expect(element.selectBox.state.filteredGroups).toHaveLength(1);

        element.remove();
    });

    test("calling open() on the controller triggers a host update with first option active", async () => {
        const element = document.createElement("test-host") as TestHost;
        document.body.append(element);

        element.selectBox.open();
        await element.updateComplete;

        expect(element.selectBox.state.open).toBe(true);
        expect(element.selectBox.state.activeOption?.label).toBe("Apple");

        element.remove();
    });
});
