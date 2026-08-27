import { act, fireEvent, render } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, test, vi } from "vitest";

import { SelectBox } from "../src/index.js";

const FRUITS = [
    { value: "apple", label: "Apple" },
    { value: "pear", label: "Pear" },
];

function Controlled({ accept }: { accept: boolean }): React.ReactElement {
    const [value, setValue] = useState<string | null>("apple");

    return (
        <SelectBox
            options={FRUITS}
            value={value}
            placeholder="Pick a fruit"
            onChange={(next) => {
                if (accept) setValue(next);
            }}
        />
    );
}

function pick(container: HTMLElement, label: string): void {
    const trigger = container.querySelector<HTMLInputElement>("[data-select-input]")!;
    act(() => trigger.focus());

    const option = [...container.querySelectorAll<HTMLButtonElement>("[data-select-option]")].find(
        (candidate) => candidate.textContent === label,
    )!;
    fireEvent.click(option);
}

function shown(container: HTMLElement): string {
    return container.querySelector<HTMLInputElement>("[data-select-input]")!.value;
}

describe("a controlled value", () => {
    test("paints the owner's value on the very first render", () => {
        const { container } = render(
            <SelectBox options={FRUITS} value="pear" placeholder="Pick" />,
        );

        expect(shown(container)).toBe("Pear");
    });

    test("takes the pick when the owner accepts it", () => {
        const { container } = render(<Controlled accept />);

        pick(container, "Pear");

        expect(shown(container)).toBe("Pear");
    });

    test("reverts a pick the owner never answers", () => {
        const { container } = render(<Controlled accept={false} />);

        pick(container, "Pear");

        expect(shown(container)).toBe("Apple");
    });

    test("follows the owner even while the control refuses input", () => {
        const { container, rerender } = render(
            <SelectBox options={FRUITS} value="apple" disabled placeholder="Pick" />,
        );

        rerender(<SelectBox options={FRUITS} value="pear" disabled placeholder="Pick" />);

        expect(shown(container)).toBe("Pear");
    });

    test("leaves an uncontrolled box owning its own selection", () => {
        const { container } = render(
            <SelectBox options={FRUITS} defaultValue="apple" placeholder="Pick" />,
        );

        pick(container, "Pear");

        expect(shown(container)).toBe("Pear");
    });

    test("announces the pick once, never its own correction", () => {
        const onChange = vi.fn();
        function Harness(): React.ReactElement {
            const [value, setValue] = useState<string | null>("apple");
            return (
                <SelectBox
                    options={FRUITS}
                    value={value}
                    placeholder="Pick"
                    onChange={(next, option) => {
                        onChange(next, option);
                        setValue(next);
                    }}
                />
            );
        }
        const { container } = render(<Harness />);

        pick(container, "Pear");

        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange).toHaveBeenCalledWith("pear", expect.objectContaining({ value: "pear" }));
    });

    test("carries a multi selection both ways", () => {
        function MultiHarness(): React.ReactElement {
            const [values, setValues] = useState<ReadonlyArray<string>>(["apple"]);
            return (
                <SelectBox
                    multiple
                    options={FRUITS}
                    value={values}
                    placeholder="Pick"
                    onChange={(next) => setValues(next)}
                />
            );
        }
        const { container } = render(<MultiHarness />);

        pick(container, "Pear");

        // A chip is its label text node followed by the remove control, so the
        // first child is the label and the rest is the affordance.
        expect(
            [...container.querySelectorAll("[data-select-chip]")].map(
                (chip) => chip.firstChild?.textContent,
            ),
        ).toEqual(["Apple", "Pear"]);
    });
});
