import { mount } from "@vue/test-utils";
import { describe, expect, test } from "vitest";

import { SelectBox } from "../src/index.js";

const fruits = [
    { value: "apple", label: "Apple" },
    { value: "pear", label: "Pear" },
    { value: "grape", label: "Grape" },
];

function makeWrapper() {
    const wrapper = mount(SelectBox, {
        props: { options: fruits, placeholder: "Pick a fruit" },
        attachTo: document.body,
    });
    return wrapper;
}

describe("<SelectBox /> (Vue)", () => {
    test("renders the trigger input with the placeholder and no value", () => {
        const wrapper = makeWrapper();
        const input = wrapper.find<HTMLInputElement>("[data-select-input]");

        expect(input.attributes("placeholder")).toBe("Pick a fruit");
        expect(input.element.value).toBe("");

        wrapper.unmount();
    });

    test("focusing the input opens the popover", async () => {
        const wrapper = makeWrapper();
        const input = wrapper.find<HTMLInputElement>("[data-select-input]");

        await input.trigger("focus");

        expect(wrapper.find("[data-select-popover]").exists()).toBe(true);

        wrapper.unmount();
    });

    test("typing into the input filters the option list", async () => {
        const wrapper = makeWrapper();
        const input = wrapper.find<HTMLInputElement>("[data-select-input]");
        await input.trigger("focus");

        await input.setValue("ear");

        const labels = wrapper.findAll("[data-select-option]").map((option) => option.text());
        expect(labels).toEqual(["Pear"]);

        wrapper.unmount();
    });

    test("Enter commits the active option, closes, and emits change", async () => {
        const wrapper = makeWrapper();
        const input = wrapper.find<HTMLInputElement>("[data-select-input]");
        await input.trigger("focus");

        await input.trigger("keydown", { key: "Enter" });

        const emitted = wrapper.emitted("change");
        expect(emitted).toHaveLength(1);
        expect(emitted![0]![0]).toBe("apple");
        expect(wrapper.find("[data-select-popover]").exists()).toBe(false);

        wrapper.unmount();
    });

    test("Escape closes the popover without emitting change", async () => {
        const wrapper = makeWrapper();
        const input = wrapper.find<HTMLInputElement>("[data-select-input]");
        await input.trigger("focus");

        await input.trigger("keydown", { key: "Escape" });

        expect(wrapper.find("[data-select-popover]").exists()).toBe(false);
        expect(wrapper.emitted("change")).toBeUndefined();

        wrapper.unmount();
    });

    test("clicking an option emits change with the matching value and option", async () => {
        const wrapper = makeWrapper();
        const input = wrapper.find<HTMLInputElement>("[data-select-input]");
        await input.trigger("focus");

        const grape = wrapper.findAll("[data-select-option]")
            .find((option) => option.text() === "Grape")!;
        await grape.trigger("click");

        const emitted = wrapper.emitted("change");
        expect(emitted).toHaveLength(1);
        expect(emitted![0]).toEqual([
            "grape",
            expect.objectContaining({ value: "grape", label: "Grape" }),
        ]);

        wrapper.unmount();
    });

    test("after committing, the input shows the selected option label when popover is closed", async () => {
        const wrapper = makeWrapper();
        const input = wrapper.find<HTMLInputElement>("[data-select-input]");
        await input.trigger("focus");

        const apple = wrapper.findAll("[data-select-option]")
            .find((option) => option.text() === "Apple")!;
        await apple.trigger("click");

        expect(input.element.value).toBe("Apple");

        wrapper.unmount();
    });
});
