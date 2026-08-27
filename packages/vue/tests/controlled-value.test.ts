import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, test } from "vitest";
import { defineComponent, h, ref } from "vue";

import SelectBox from "../src/SelectBox.vue";

const FRUITS = [
    { value: "apple", label: "Apple" },
    { value: "pear", label: "Pear" },
];

let announced: Array<string | null> = [];

function controlledHost(accept: boolean) {
    return defineComponent({
        setup() {
            const value = ref<string | null>("apple");

            const onChange = (next: string | null): void => {
                announced.push(next);
                if (accept) value.value = next;
            };

            return () =>
                h(SelectBox, {
                    options: FRUITS,
                    value: value.value,
                    placeholder: "Pick a fruit",
                    onChange,
                });
        },
    });
}

async function pickPear(root: Element): Promise<void> {
    root.querySelector<HTMLInputElement>("[data-select-input]")!.focus();
    await Promise.resolve();

    const option = [...root.querySelectorAll<HTMLButtonElement>("[data-select-option]")].find(
        (candidate) => candidate.textContent === "Pear",
    )!;
    option.click();
    await Promise.resolve();
    await Promise.resolve();
}

function shown(root: Element): string {
    return root.querySelector<HTMLInputElement>("[data-select-input]")!.value;
}

beforeEach(() => {
    announced = [];
});

describe("a controlled value (Vue)", () => {
    test("paints the owner's value on the very first render", () => {
        const wrapper = mount(SelectBox, {
            props: { options: FRUITS, value: "pear", placeholder: "Pick" },
        });

        expect(shown(wrapper.element)).toBe("Pear");
    });

    test("takes the pick when the owner accepts it", async () => {
        const wrapper = mount(controlledHost(true), { attachTo: document.body });

        await pickPear(wrapper.element);

        expect(shown(wrapper.element)).toBe("Pear");
    });

    test("reverts a pick the owner never answers", async () => {
        const wrapper = mount(controlledHost(false), { attachTo: document.body });

        await pickPear(wrapper.element);

        expect(shown(wrapper.element)).toBe("Apple");
    });

    test("announces the pick once, never its own correction", async () => {
        const wrapper = mount(controlledHost(true), { attachTo: document.body });

        await pickPear(wrapper.element);

        expect(announced).toEqual(["pear"]);
    });

    test("follows the owner even while the control refuses input", async () => {
        const wrapper = mount(SelectBox, {
            props: { options: FRUITS, value: "apple", disabled: true, placeholder: "Pick" },
        });

        await wrapper.setProps({ value: "pear" });

        expect(shown(wrapper.element)).toBe("Pear");
    });
});
