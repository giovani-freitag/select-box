import { mount } from "@vue/test-utils";
import { describe, expect, test } from "vitest";

import { packageName, SelectBox, useSelectBox } from "../src/index.js";

describe("@select-box/vue", () => {
    test("exports the composable, the component, and the package name", () => {
        expect(packageName).toBe("@select-box/vue");
        expect(typeof useSelectBox).toBe("function");
        expect(typeof SelectBox).toBe("object");
    });

    test("renders the trigger with placeholder when no value is selected", () => {
        const wrapper = mount(SelectBox, {
            props: {
                options: [
                    { value: "a", label: "Apple" },
                    { value: "b", label: "Banana" },
                ],
                placeholder: "Pick a fruit",
            },
        });

        const trigger = wrapper.find("[data-select-trigger]");

        expect(trigger.exists()).toBe(true);
        expect(trigger.text()).toContain("Pick a fruit");
    });
});
