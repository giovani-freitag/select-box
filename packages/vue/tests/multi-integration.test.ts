import { mount } from "@vue/test-utils";
import { describe, expect, test } from "vitest";

import { SelectBox } from "../src/index.js";

const fruits = [
    { value: "apple", label: "Apple" },
    { value: "pear", label: "Pear" },
    { value: "grape", label: "Grape" },
];

function makeWrapper(propsOverride: Record<string, unknown> = {}) {
    return mount(SelectBox, {
        props: { multiple: true, options: fruits, placeholder: "Pick fruits", ...propsOverride },
        attachTo: document.body,
    });
}

describe("<SelectBox multiple /> (Vue)", () => {
    test("renders with chips when defaultValue is provided", () => {
        const wrapper = makeWrapper({ defaultValue: ["apple", "pear"] });

        expect(wrapper.findAll("[data-select-chip]")).toHaveLength(2);
        expect(wrapper.find("[data-select-mode='multi']").exists()).toBe(true);

        wrapper.unmount();
    });

    test("clicking an option commits as a chip and keeps the popover open", async () => {
        const wrapper = makeWrapper();
        const input = wrapper.find<HTMLInputElement>("[data-select-input]");
        await input.trigger("focus");

        const apple = wrapper
            .findAll<HTMLButtonElement>("[data-select-option]")
            .find((option) => option.text().includes("Apple"))!;
        await apple.trigger("click");

        expect(wrapper.findAll("[data-select-chip]")).toHaveLength(1);
        expect(wrapper.find("[data-select-popover]").exists()).toBe(true);

        wrapper.unmount();
    });

    test("chip remove button toggles the option off", async () => {
        const wrapper = makeWrapper({ defaultValue: ["pear", "grape"] });

        const removeButtons = wrapper.findAll<HTMLButtonElement>(".select-box-chip-remove");
        await removeButtons[0]!.trigger("click");

        const chipLabels = wrapper
            .findAll("[data-select-chip]")
            .map((chip) => chip.text().replace("×", "").trim());
        expect(chipLabels).toEqual(["Grape"]);

        wrapper.unmount();
    });

    test("clear button empties the selection", async () => {
        const wrapper = makeWrapper({ defaultValue: ["apple", "pear"] });

        await wrapper.find<HTMLButtonElement>("[data-select-clear]").trigger("click");

        expect(wrapper.findAll("[data-select-chip]")).toHaveLength(0);

        wrapper.unmount();
    });

    test("toggling multi → single preserves the first selected option", async () => {
        const wrapper = makeWrapper({ defaultValue: ["pear", "apple"] });

        expect(wrapper.findAll("[data-select-chip]")).toHaveLength(2);

        await wrapper.setProps({ multiple: false });

        expect(wrapper.find("[data-select-mode='single']").exists()).toBe(true);
        expect(wrapper.findAll("[data-select-chip]")).toHaveLength(0);
        const input = wrapper.find<HTMLInputElement>("[data-select-input]");
        expect(input.element.value).toBe("Pear");

        wrapper.unmount();
    });

    test("toggling single → multi wraps the held value as a singleton chip", async () => {
        const wrapper = mount(SelectBox, {
            props: { options: fruits, defaultValue: "apple" },
            attachTo: document.body,
        });

        await wrapper.setProps({ multiple: true });

        expect(wrapper.find("[data-select-mode='multi']").exists()).toBe(true);
        const chips = wrapper
            .findAll("[data-select-chip]")
            .map((chip) => chip.text().replace("×", "").trim());
        expect(chips).toEqual(["Apple"]);

        wrapper.unmount();
    });
});
