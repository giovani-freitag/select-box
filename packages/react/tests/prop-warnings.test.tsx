import { render } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import { SelectBox } from "../src/index.js";

const FRUITS = [{ value: "apple", label: "Apple" }];

afterEach(() => {
    vi.restoreAllMocks();
});

function captureWarnings(): { readonly messages: string[] } {
    const messages: string[] = [];
    vi.spyOn(console, "warn").mockImplementation((message: unknown) => {
        messages.push(String(message));
    });
    return { messages };
}

describe("prop pairs that would fail silently", () => {
    test("warns when a value arrives with no way to answer it", () => {
        const warnings = captureWarnings();

        render(<SelectBox options={FRUITS} value="apple" />);

        expect(warnings.messages.join(" ")).toContain("without `onChange`");
    });

    test("stays quiet when the control is not meant to accept input", () => {
        const warnings = captureWarnings();

        render(<SelectBox options={FRUITS} value="apple" readOnly />);

        expect(warnings.messages).toEqual([]);
    });

    test("stays quiet when the owner can answer", () => {
        const warnings = captureWarnings();

        render(<SelectBox options={FRUITS} value="apple" onChange={() => {}} />);

        expect(warnings.messages).toEqual([]);
    });

    test("warns when both value and defaultValue are supplied", () => {
        const warnings = captureWarnings();

        render(
            <SelectBox options={FRUITS} value="apple" defaultValue="apple" onChange={() => {}} />,
        );

        expect(warnings.messages.join(" ")).toContain("`defaultValue` is ignored");
    });

    test("says nothing for an ordinary uncontrolled box", () => {
        const warnings = captureWarnings();

        render(<SelectBox options={FRUITS} defaultValue="apple" />);

        expect(warnings.messages).toEqual([]);
    });
});
