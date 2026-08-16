import { describe, expect, test } from "vitest";

import { SelectBoxSnapshotView } from "../src/snapshot-view.js";
import type { SelectBoxSnapshot, SelectionValue } from "../src/types.js";

function snapshot(
    overrides: Partial<SelectBoxSnapshot<object, SelectionValue>>,
): SelectBoxSnapshot<object, SelectionValue> {
    return {
        mode: "single",
        open: false,
        query: "",
        value: null,
        selectedOption: null,
        selectedOptions: [],
        filteredGroups: [],
        activeIndex: -1,
        activeOption: null,
        isEmpty: true,
        highlightRanges: () => [],
        addons: {},
        ...overrides,
    };
}

describe("SelectBoxSnapshotView.isSelected", () => {
    test("single mode — matches when the value equals the option key", () => {
        const view = new SelectBoxSnapshotView(snapshot({ mode: "single", value: "apple" }));

        expect(view.isSelected("apple")).toBe(true);
        expect(view.isSelected("pear")).toBe(false);
    });

    test("single mode, null value — never selected", () => {
        const view = new SelectBoxSnapshotView(snapshot({ mode: "single", value: null }));

        expect(view.isSelected("apple")).toBe(false);
    });

    test("multi mode — matches when the array includes the option key", () => {
        const view = new SelectBoxSnapshotView(
            snapshot({ mode: "multi", value: ["apple", "pear"] }),
        );

        expect(view.isSelected("pear")).toBe(true);
        expect(view.isSelected("plum")).toBe(false);
    });

    test("multi mode, empty array — never selected", () => {
        const view = new SelectBoxSnapshotView(snapshot({ mode: "multi", value: [] }));

        expect(view.isSelected("apple")).toBe(false);
    });
});

describe("SelectBoxSnapshotView.triggerInputValue", () => {
    test("single, closed, with selection — shows the option label", () => {
        const view = new SelectBoxSnapshotView(
            snapshot({
                mode: "single",
                open: false,
                value: "apple",
                selectedOption: { value: "apple", label: "Apple" },
            }),
        );

        expect(view.triggerInputValue).toBe("Apple");
    });

    test("single, closed, without selection — empty string", () => {
        const view = new SelectBoxSnapshotView(snapshot({ mode: "single", open: false }));

        expect(view.triggerInputValue).toBe("");
    });

    test("single, open — shows the live query even with a selection", () => {
        const view = new SelectBoxSnapshotView(
            snapshot({
                mode: "single",
                open: true,
                query: "ap",
                value: "apple",
                selectedOption: { value: "apple", label: "Apple" },
            }),
        );

        expect(view.triggerInputValue).toBe("ap");
    });

    test("multi, any state — always shows the live query", () => {
        const closed = new SelectBoxSnapshotView(
            snapshot({ mode: "multi", open: false, query: "pe" }),
        );
        const openWithSel = new SelectBoxSnapshotView(
            snapshot({
                mode: "multi",
                open: true,
                query: "le",
                value: ["lemon"],
                selectedOptions: [{ value: "lemon", label: "Lemon" }],
            }),
        );

        expect(closed.triggerInputValue).toBe("pe");
        expect(openWithSel.triggerInputValue).toBe("le");
    });
});

describe("SelectBoxSnapshotView.valueKey", () => {
    test("null distinguishes from an empty selection", () => {
        const single = new SelectBoxSnapshotView(snapshot({ mode: "single", value: null }));
        const multi = new SelectBoxSnapshotView(snapshot({ mode: "multi", value: [] }));

        expect(single.valueKey).not.toBe(multi.valueKey);
    });

    test("instance getter and static method agree", () => {
        const view = new SelectBoxSnapshotView(
            snapshot({ mode: "multi", value: ["apple", "pear"] }),
        );

        expect(view.valueKey).toBe(SelectBoxSnapshotView.valueKey(["apple", "pear"]));
    });

    test("identical contents yield identical keys regardless of array identity", () => {
        const a: ReadonlyArray<string> = ["apple", "pear"];
        const b: ReadonlyArray<string> = ["apple", "pear"];

        expect(SelectBoxSnapshotView.valueKey(a)).toBe(SelectBoxSnapshotView.valueKey(b));
    });

    test("order changes produce different keys", () => {
        expect(SelectBoxSnapshotView.valueKey(["a", "b"])).not.toBe(
            SelectBoxSnapshotView.valueKey(["b", "a"]),
        );
    });

    test("single string passes through unchanged", () => {
        expect(SelectBoxSnapshotView.valueKey("apple")).toBe("apple");
    });
});
