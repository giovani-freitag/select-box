import { describe, expect, test } from "vitest";

import { SubstringFilterStrategy } from "../src/filters/index.js";
import { SingleSelectBoxController } from "../src/controllers/single-select-box-controller.js";
import type { SelectOption } from "../src/types.js";

const fruits: ReadonlyArray<SelectOption> = [
    { value: "apple", label: "Apple" },
    { value: "pear", label: "Pear" },
    { value: "grape", label: "Grape" },
];

/** Counts how often the filter actually runs, which is the cost being avoided. */
class CountingFilter extends SubstringFilterStrategy {
    calls = 0;

    override filter(
        options: ReadonlyArray<SelectOption>,
        query: string,
    ): ReadonlyArray<SelectOption> {
        this.calls += 1;
        return super.filter(options, query);
    }
}

describe("filtered-groups pipeline", () => {
    test("runs the filter once per interaction, not once per read", () => {
        const filter = new CountingFilter();
        const controller = new SingleSelectBoxController({ options: fruits, filter });
        controller.open();
        const afterOpen = filter.calls;

        controller.setQuery("ap");

        // One group, so one filter call for the whole interaction: the active-row
        // re-anchor and the snapshot build now share it.
        expect(filter.calls - afterOpen).toBe(1);
    });

    test("re-runs the filter when the query moves", () => {
        const filter = new CountingFilter();
        const controller = new SingleSelectBoxController({ options: fruits, filter });
        controller.open();

        controller.setQuery("ap");
        const afterFirst = filter.calls;
        controller.setQuery("pe");

        expect(filter.calls).toBeGreaterThan(afterFirst);
    });

    test("re-runs the filter when the options change", () => {
        const filter = new CountingFilter();
        const controller = new SingleSelectBoxController({ options: fruits, filter });
        controller.open();
        controller.setQuery("ap");
        const afterQuery = filter.calls;

        controller.setOptions([{ value: "fig", label: "Fig" }]);

        expect(filter.calls).toBeGreaterThan(afterQuery);
    });

    test("re-runs the filter when an addon joins", () => {
        const filter = new CountingFilter();
        const controller = new SingleSelectBoxController({ options: fruits, filter });
        controller.open();
        const afterOpen = filter.calls;

        controller.use({ name: "probe", transformGroups: (groups) => groups });

        expect(filter.calls).toBeGreaterThan(afterOpen);
    });

    test("re-runs the filter when the selection changes", () => {
        const filter = new CountingFilter();
        const controller = new SingleSelectBoxController({ options: fruits, filter });
        controller.open();
        const afterOpen = filter.calls;

        controller.commitValue("pear");

        expect(filter.calls).toBeGreaterThan(afterOpen);
    });
});
