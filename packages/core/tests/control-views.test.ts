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
        disabled: false,
        readOnly: false,
        pending: false,
        highlightRanges: () => [],
        addons: {},
        ...overrides,
    };
}

function viewOf(
    overrides: Partial<SelectBoxSnapshot<object, SelectionValue>>,
): SelectBoxSnapshotView<object, SelectionValue> {
    return new SelectBoxSnapshotView(snapshot(overrides));
}

const apple = { value: "apple", label: "Apple" };

describe("clearControl without the addon", () => {
    test("stays hidden in single mode, where no wrapper ships one", () => {
        expect(viewOf({ selectedOptions: [apple], value: "apple" }).clearControl.visible).toBe(
            false,
        );
    });

    test("shows in multi mode once something is selected", () => {
        expect(
            viewOf({ mode: "multi", value: ["apple"], selectedOptions: [apple] })
                .clearControl.visible,
        ).toBe(true);
    });

    test("stays hidden in multi mode with nothing selected", () => {
        expect(viewOf({ mode: "multi", value: [] }).clearControl.visible).toBe(false);
    });

    test("carries the built-in glyph and name", () => {
        const control = viewOf({ mode: "multi", selectedOptions: [apple] }).clearControl;

        expect(control.label).toBe("×");
        expect(control.ariaLabel).toBe("Clear all");
    });
});

describe("clearControl with the addon installed", () => {
    test("the addon's visibility wins over the built-in rule", () => {
        const control = viewOf({
            selectedOptions: [apple],
            addons: { "clear-button": { visible: true, label: "⨯", ariaLabel: "Limpar" } },
        }).clearControl;

        expect(control.visible).toBe(true);
        expect(control.label).toBe("⨯");
        expect(control.ariaLabel).toBe("Limpar");
    });

    test("the addon can take the control away in multi mode too", () => {
        expect(
            viewOf({
                mode: "multi",
                selectedOptions: [apple],
                addons: { "clear-button": { visible: false, label: "×", ariaLabel: "x" } },
            } as never).clearControl.visible,
        ).toBe(false);
    });

    test("a slice missing fields falls back per field", () => {
        const control = viewOf({
            mode: "multi",
            selectedOptions: [apple],
            addons: { "clear-button": { visible: true } },
        } as never).clearControl;

        expect(control.label).toBe("×");
        expect(control.ariaLabel).toBe("Clear all");
    });

    test("a slice of the wrong shape is ignored rather than trusted", () => {
        expect(
            viewOf({ addons: { "clear-button": "yes" } }).clearControl.visible,
        ).toBe(false);
    });
});

describe("removeControl", () => {
    test("is enabled and English without the addon", () => {
        const control = viewOf({ mode: "multi", selectedOptions: [apple] }).removeControl;

        expect(control.enabled).toBe(true);
        expect(control.label).toBe("×");
        expect(control.ariaLabelFor("Apple")).toBe("Remove Apple");
    });

    test("takes the translated name the addon published", () => {
        const control = viewOf({
            mode: "multi",
            selectedOptions: [apple],
            addons: {
                "remove-button": {
                    enabled: true,
                    label: "⨯",
                    removable: [
                        { value: "apple", label: "Apple", ariaLabel: "Remover Apple" },
                    ],
                },
            },
        } as never).removeControl;

        expect(control.label).toBe("⨯");
        expect(control.ariaLabelFor("Apple")).toBe("Remover Apple");
    });

    test("falls back for an option the addon did not name", () => {
        const control = viewOf({
            mode: "multi",
            addons: { "remove-button": { enabled: true, removable: [] } },
        } as never).removeControl;

        expect(control.ariaLabelFor("Pear")).toBe("Remove Pear");
    });

    test("the addon can disable the control", () => {
        expect(
            viewOf({
                mode: "multi",
                addons: { "remove-button": { enabled: false, removable: [] } },
            } as never).removeControl.enabled,
        ).toBe(false);
    });

    test("ignores malformed entries instead of rendering junk", () => {
        const control = viewOf({
            mode: "multi",
            addons: {
                "remove-button": {
                    enabled: true,
                    removable: [null, { label: 7, ariaLabel: "x" }, "nope"],
                },
            },
        } as never).removeControl;

        expect(control.ariaLabelFor("Apple")).toBe("Remove Apple");
    });
});
