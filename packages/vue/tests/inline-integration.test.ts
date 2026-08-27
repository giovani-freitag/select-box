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
        props: { surface: "inline", options: fruits, ...propsOverride },
        attachTo: document.body,
    });
}

function pressedStates(wrapper: ReturnType<typeof makeWrapper>): Array<string | undefined> {
    return wrapper.findAll("[data-select-chip]").map((chip) => chip.attributes("aria-pressed"));
}

describe("<SelectBox surface=\"inline\" /> (Vue)", () => {
    test("renders one chip per option and no popover", () => {
        const wrapper = makeWrapper();

        expect(wrapper.findAll("[data-select-chip]")).toHaveLength(fruits.length);
        expect(wrapper.find("[data-select-popover]").exists()).toBe(false);
        expect(wrapper.find("[data-select-input]").exists()).toBe(false);
        expect(wrapper.find("[data-select-surface='inline']").exists()).toBe(true);

        wrapper.unmount();
    });

    test("single mode replaces selection on chip click", async () => {
        const wrapper = makeWrapper();

        const chips = wrapper.findAll<HTMLButtonElement>("[data-select-chip]");
        await chips[0]!.trigger("click");
        await chips[1]!.trigger("click");

        const emitted = wrapper.emitted("change");
        expect(emitted).toHaveLength(2);
        expect(emitted![1]).toEqual([
            "pear",
            expect.objectContaining({ value: "pear", label: "Pear" }),
        ]);
        expect(pressedStates(wrapper)).toEqual(["false", "true", "false"]);

        wrapper.unmount();
    });

    test("multi mode toggles selection on each chip click", async () => {
        const wrapper = makeWrapper({ multi: true });

        const chips = wrapper.findAll<HTMLButtonElement>("[data-select-chip]");
        await chips[0]!.trigger("click");
        await chips[2]!.trigger("click");

        expect(pressedStates(wrapper)).toEqual(["true", "false", "true"]);

        await chips[0]!.trigger("click");

        const emitted = wrapper.emitted("change");
        expect(emitted).toHaveLength(3);
        expect(emitted![2]![0]).toEqual(["grape"]);
        expect(pressedStates(wrapper)).toEqual(["false", "false", "true"]);

        wrapper.unmount();
    });
});
