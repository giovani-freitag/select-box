import { render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, test } from "vitest";

import { SelectBox } from "../src/index.js";

let renderCount = 0;

function Harness(): React.ReactElement {
    renderCount += 1;
    const [tick, setTick] = useState(0);

    return (
        <div>
            <button type="button" onClick={() => setTick((count) => count + 1)}>
                bump
            </button>
            <SelectBox
                options={[
                    { value: "apple", label: "Apple" },
                    { value: "pear", label: "Pear" },
                ]}
                placeholder="Pick a fruit"
            />
            <span data-testid="tick">{tick}</span>
        </div>
    );
}

describe("options handed over as an inline literal", () => {
    test("an unrelated re-render does not feed itself through setOptions", async () => {
        renderCount = 0;
        render(<Harness />);

        screen.getByRole("button", { name: "bump" }).click();
        await new Promise((resolve) => setTimeout(resolve, 250));

        expect(screen.getByTestId("tick").textContent).toBe("1");
        expect(renderCount).toBeLessThanOrEqual(4);
    });
});
