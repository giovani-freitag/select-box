import { act, fireEvent, render } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, test, vi } from "vitest";

import { SelectBox, type SelectBoxHandle } from "../src/SelectBox.js";

const fruits = [
    { value: "apple", label: "Apple" },
    { value: "pear", label: "Pear" },
    { value: "grape", label: "Grape" },
];

function mount() {
    const result = render(<SelectBox options={fruits} placeholder="Pick a fruit" />);
    const input = result.container.querySelector<HTMLInputElement>("[data-select-input]")!;
    return { ...result, input };
}

describe("<SelectBox /> (React)", () => {
    test("the ref hands over the root element and the live controller", () => {
        const ref = createRef<SelectBoxHandle>();

        const { container } = render(<SelectBox ref={ref} options={fruits} />);

        expect(ref.current?.root).toBe(container.querySelector("[data-select-root]"));
        expect(ref.current?.controller.getState().open).toBe(false);
    });

    test("the ref tracks the current root across a surface change", () => {
        const ref = createRef<SelectBoxHandle>();
        const view = render(<SelectBox ref={ref} options={fruits} surface="popover" />);

        act(() => {
            view.rerender(<SelectBox ref={ref} options={fruits} surface="inline" />);
        });

        expect(ref.current?.root).toBe(view.container.querySelector("[data-select-root]"));
    });

    test("renders the trigger input with the placeholder and no value", () => {
        const { input } = mount();

        expect(input.placeholder).toBe("Pick a fruit");
        expect(input.value).toBe("");
    });

    test("focusing the input opens the popover", () => {
        const { input, container } = mount();

        act(() => input.focus());

        expect(container.querySelector("[data-select-popover]")).not.toBeNull();
    });

    test("typing into the input filters the option list", () => {
        const { input, container } = mount();
        act(() => input.focus());

        fireEvent.change(input, { target: { value: "ear" } });

        const options = [...container.querySelectorAll("[data-select-option]")].map(
            (option) => option.textContent,
        );
        expect(options).toEqual(["Pear"]);
    });

    test("Enter commits the active option and closes the popover", () => {
        const onChange = vi.fn();
        const { container } = render(
            <SelectBox options={fruits} placeholder="Pick" onChange={onChange} />,
        );
        const trigger = container.querySelector<HTMLInputElement>("[data-select-input]")!;
        act(() => trigger.focus());

        fireEvent.keyDown(trigger, { key: "Enter" });

        expect(onChange).toHaveBeenCalledWith("apple", expect.objectContaining({ value: "apple" }));
        expect(container.querySelector("[data-select-popover]")).toBeNull();
    });

    test("Escape closes the popover without committing", () => {
        const onChange = vi.fn();
        const { container } = render(
            <SelectBox options={fruits} placeholder="Pick" onChange={onChange} />,
        );
        const trigger = container.querySelector<HTMLInputElement>("[data-select-input]")!;
        act(() => trigger.focus());

        fireEvent.keyDown(trigger, { key: "Escape" });

        expect(container.querySelector("[data-select-popover]")).toBeNull();
        expect(onChange).not.toHaveBeenCalled();
    });

    test("clicking an option commits it and surfaces the value through onChange", () => {
        const onChange = vi.fn();
        const { container } = render(
            <SelectBox options={fruits} placeholder="Pick" onChange={onChange} />,
        );
        const trigger = container.querySelector<HTMLInputElement>("[data-select-input]")!;
        act(() => trigger.focus());

        const grape = [...container.querySelectorAll<HTMLButtonElement>("[data-select-option]")]
            .find((option) => option.textContent === "Grape")!;
        fireEvent.click(grape);

        expect(onChange).toHaveBeenCalledWith("grape", expect.objectContaining({ label: "Grape" }));
    });

    test("clicking outside the root closes the popover", () => {
        const { input, container } = mount();
        act(() => input.focus());

        fireEvent.mouseDown(document.body);

        expect(container.querySelector("[data-select-popover]")).toBeNull();
    });

    test("after committing, the input shows the selected option label when the popover is closed", () => {
        const { container } = mount();
        const input = container.querySelector<HTMLInputElement>("[data-select-input]")!;
        act(() => input.focus());

        const apple = container.querySelector<HTMLButtonElement>("[data-select-option]")!;
        fireEvent.click(apple);

        expect(input.value).toBe("Apple");
    });
});
