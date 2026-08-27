import { fireEvent, render } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { SelectBox } from "../src/SelectBox.js";

const fruits = [
    { value: "apple", label: "Apple" },
    { value: "pear", label: "Pear" },
    { value: "grape", label: "Grape" },
];

describe("<SelectBox surface=\"inline\" /> (React)", () => {
    test("renders one chip per option and no popover", () => {
        const { container } = render(
            <SelectBox surface="inline" options={fruits} />,
        );

        const chips = container.querySelectorAll("[data-select-chip]");
        expect(chips).toHaveLength(fruits.length);

        expect(container.querySelector("[data-select-popover]")).toBeNull();
        expect(container.querySelector("[data-select-input]")).toBeNull();
        expect(container.querySelector("[data-select-surface='inline']")).not.toBeNull();
    });

    test("single mode replaces selection on chip click", () => {
        const onChange = vi.fn();
        const { container } = render(
            <SelectBox surface="inline" options={fruits} onChange={onChange} />,
        );

        const chips = container.querySelectorAll<HTMLButtonElement>("[data-select-chip]");
        fireEvent.click(chips[0]!);
        fireEvent.click(chips[1]!);

        expect(onChange).toHaveBeenLastCalledWith("pear", fruits[1]);
        expect(chips[0]!.getAttribute("aria-pressed")).toBe("false");
        expect(chips[1]!.getAttribute("aria-pressed")).toBe("true");
    });

    test("multi mode toggles selection on each chip click", () => {
        const onChange = vi.fn();
        const { container } = render(
            <SelectBox surface="inline" multiple options={fruits} onChange={onChange} />,
        );

        const chips = container.querySelectorAll<HTMLButtonElement>("[data-select-chip]");
        fireEvent.click(chips[0]!);
        fireEvent.click(chips[2]!);

        expect(onChange).toHaveBeenLastCalledWith(
            ["apple", "grape"],
            [fruits[0], fruits[2]],
        );
        expect(chips[0]!.getAttribute("aria-pressed")).toBe("true");
        expect(chips[1]!.getAttribute("aria-pressed")).toBe("false");
        expect(chips[2]!.getAttribute("aria-pressed")).toBe("true");

        fireEvent.click(chips[0]!);
        expect(onChange).toHaveBeenLastCalledWith(["grape"], [fruits[2]]);
    });
});
