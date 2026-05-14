import { act, fireEvent, render } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { SelectBox } from "../src/SelectBox.js";

const fruits = [
    { value: "apple", label: "Apple" },
    { value: "pear", label: "Pear" },
    { value: "grape", label: "Grape" },
];

function mount(props: Partial<React.ComponentProps<typeof SelectBox>> = {}) {
    const result = render(
        <SelectBox multi options={fruits} placeholder="Pick fruits" {...props} />,
    );
    const input = result.container.querySelector<HTMLInputElement>("[data-select-input]")!;
    return { ...result, input };
}

describe("<SelectBox multi /> (React)", () => {
    test("renders the trigger with placeholder and no chips", () => {
        const { input, container } = mount();

        expect(input.placeholder).toBe("Pick fruits");
        expect(container.querySelectorAll("[data-select-chip]")).toHaveLength(0);
        expect(container.querySelector("[data-select-mode='multi']")).not.toBeNull();
    });

    test("focusing the input opens the popover", () => {
        const { input, container } = mount();

        act(() => input.focus());

        expect(container.querySelector("[data-select-popover]")).not.toBeNull();
    });

    test("clicking an option commits it as a chip and keeps the popover open", () => {
        const onChange = vi.fn();
        const { input, container } = mount({ onChange });
        act(() => input.focus());

        const apple = [...container.querySelectorAll<HTMLButtonElement>("[data-select-option]")]
            .find((option) => option.textContent?.includes("Apple"))!;
        fireEvent.click(apple);

        expect(onChange).toHaveBeenCalledWith(
            ["apple"],
            expect.arrayContaining([expect.objectContaining({ value: "apple" })]),
        );
        expect(container.querySelectorAll("[data-select-chip]")).toHaveLength(1);
        expect(container.querySelector("[data-select-popover]")).not.toBeNull();
    });

    test("clicking the same option twice toggles it off", () => {
        const onChange = vi.fn();
        const { input, container } = mount({ onChange });
        act(() => input.focus());

        const apple = [...container.querySelectorAll<HTMLButtonElement>("[data-select-option]")]
            .find((option) => option.textContent?.includes("Apple"))!;
        fireEvent.click(apple);
        fireEvent.click(apple);

        expect(container.querySelectorAll("[data-select-chip]")).toHaveLength(0);
        expect(onChange).toHaveBeenLastCalledWith([], []);
    });

    test("chip remove button toggles its option off", () => {
        const { input, container } = mount({ defaultValue: ["pear", "grape"] });
        act(() => input.focus());

        const removeButtons = container.querySelectorAll<HTMLButtonElement>(
            ".select-box-chip-remove",
        );
        fireEvent.click(removeButtons[0]!);

        const chipLabels = [...container.querySelectorAll("[data-select-chip]")].map(
            (chip) => chip.textContent?.replace("×", "").trim(),
        );
        expect(chipLabels).toEqual(["Grape"]);
    });

    test("clear button empties the selection", () => {
        const onChange = vi.fn();
        const { container } = mount({
            defaultValue: ["apple", "pear"],
            onChange,
        });

        const clearButton = container.querySelector<HTMLButtonElement>("[data-select-clear]")!;
        fireEvent.click(clearButton);

        expect(container.querySelectorAll("[data-select-chip]")).toHaveLength(0);
        expect(onChange).toHaveBeenLastCalledWith([], []);
    });

    test("typing in the input filters options without dropping chips", () => {
        const { input, container } = mount({ defaultValue: ["apple"] });
        act(() => input.focus());

        fireEvent.change(input, { target: { value: "pe" } });

        const visibleLabels = [...container.querySelectorAll("[data-select-option]")].map(
            (option) => option.textContent,
        );
        expect(visibleLabels.some((label) => label?.includes("Pear"))).toBe(true);
        expect(visibleLabels.some((label) => label?.includes("Apple"))).toBe(false);
        expect(container.querySelectorAll("[data-select-chip]")).toHaveLength(1);
    });

    test("Enter on an active option toggles it", () => {
        const onChange = vi.fn();
        const { input } = mount({ onChange });
        act(() => input.focus());

        fireEvent.keyDown(input, { key: "ArrowDown" });
        fireEvent.keyDown(input, { key: "Enter" });

        expect(onChange).toHaveBeenLastCalledWith(
            ["pear"],
            expect.arrayContaining([expect.objectContaining({ value: "pear" })]),
        );
    });

    test("selected options are marked with aria-selected and the selected class", () => {
        const { input, container } = mount({ defaultValue: ["pear"] });
        act(() => input.focus());

        const selectedOption = [...container.querySelectorAll<HTMLButtonElement>("[data-select-option]")]
            .find((option) => option.textContent?.includes("Pear"))!;

        expect(selectedOption.getAttribute("aria-selected")).toBe("true");
        expect(selectedOption.className).toContain("select-box-option-selected");
    });

    test("clicking outside the root closes the popover but keeps the selection", () => {
        const { input, container } = mount({ defaultValue: ["apple"] });
        act(() => input.focus());

        fireEvent.mouseDown(document.body);

        expect(container.querySelector("[data-select-popover]")).toBeNull();
        expect(container.querySelectorAll("[data-select-chip]")).toHaveLength(1);
    });

    test("toggling multi → single preserves the first selected option (native <select> semantics)", () => {
        const { container, rerender } = render(
            <SelectBox multi options={fruits} defaultValue={["pear", "apple"]} />,
        );

        expect(container.querySelectorAll("[data-select-chip]")).toHaveLength(2);

        rerender(<SelectBox options={fruits} />);

        expect(container.querySelector("[data-select-mode='single']")).not.toBeNull();
        expect(container.querySelectorAll("[data-select-chip]")).toHaveLength(0);
        const input = container.querySelector<HTMLInputElement>("[data-select-input]")!;
        expect(input.value).toBe("Pear");
    });

    test("toggling single → multi wraps the held value as a singleton chip", () => {
        const { container, rerender } = render(
            <SelectBox options={fruits} defaultValue="apple" />,
        );

        rerender(<SelectBox multi options={fruits} />);

        expect(container.querySelector("[data-select-mode='multi']")).not.toBeNull();
        const chips = [...container.querySelectorAll("[data-select-chip]")].map((chip) =>
            chip.textContent?.replace("×", "").trim(),
        );
        expect(chips).toEqual(["Apple"]);
    });
});
