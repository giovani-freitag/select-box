import { fireEvent, render } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { SelectBox } from "../src/index.js";

const FRUITS = [
    { value: "apple", label: "Apple" },
    { value: "pear", label: "Pear" },
];

describe("reaching the DOM a consumer has to reach", () => {
    test("puts `id` on the root and `inputId` on the control a label can point at", () => {
        const { container } = render(
            <SelectBox options={FRUITS} id="picker" inputId="picker-input" placeholder="Pick" />,
        );

        expect(container.querySelector("[data-select-root]")?.id).toBe("picker");
        expect(container.querySelector("[data-select-input]")?.id).toBe("picker-input");
    });

    test("lets a real label focus the control", () => {
        const { container } = render(
            <div>
                <label htmlFor="fruit-input">Fruit</label>
                <SelectBox options={FRUITS} inputId="fruit-input" placeholder="Pick" />
            </div>,
        );

        const label = container.querySelector("label")!;
        expect(label.control).toBe(container.querySelector("[data-select-input]"));
    });

    test("reports blur, which is what a form library calls touched", () => {
        const onBlur = vi.fn();
        const { container } = render(
            <SelectBox options={FRUITS} onBlur={onBlur} placeholder="Pick" />,
        );

        fireEvent.blur(container.querySelector("[data-select-input]")!);

        expect(onBlur).toHaveBeenCalledTimes(1);
    });

    test("still opens on focus while telling the consumer about it", () => {
        const onFocus = vi.fn();
        const { container } = render(
            <SelectBox options={FRUITS} onFocus={onFocus} placeholder="Pick" />,
        );

        fireEvent.focus(container.querySelector("[data-select-input]")!);

        expect(onFocus).toHaveBeenCalledTimes(1);
        expect(container.querySelector("[data-select-popover]")).not.toBeNull();
    });

    test("carries style through to the root", () => {
        const { container } = render(
            <SelectBox options={FRUITS} style={{ width: "220px" }} placeholder="Pick" />,
        );

        expect(container.querySelector<HTMLElement>("[data-select-root]")?.style.width).toBe(
            "220px",
        );
    });
});
