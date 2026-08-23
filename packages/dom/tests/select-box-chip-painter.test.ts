// @vitest-environment happy-dom
import {
    MultiSelectBoxController,
    SelectBoxSnapshotView,
    SingleSelectBoxController,
    type SelectBoxController,
    type SelectionValue,
    type SelectOption,
} from "@select-box/core";
import { describe, expect, test } from "vitest";

import { SelectBoxChipPainter } from "../src/select-box-chip-painter.js";
import { SelectBoxNodeFactory } from "../src/select-box-node-factory.js";

const fruits: ReadonlyArray<SelectOption> = [
    { value: "apple", label: "Apple", group: "Pomes" },
    { value: "pear", label: "Pear", group: "Pomes" },
    { value: "lemon", label: "Lemon", group: "Citrus" },
];

function painterFor(
    controller: SelectBoxController<object, SelectionValue>,
): SelectBoxChipPainter {
    return new SelectBoxChipPainter({
        factory: new SelectBoxNodeFactory({
            instanceId: "sb-1",
            getController: () => controller,
            refocus: () => undefined,
        }),
    });
}

function createTagsContainer(): HTMLElement {
    const container = document.createElement("div");
    container.dataset["selectTags"] = "";
    const input = document.createElement("input");
    input.dataset["selectInput"] = "";
    container.append(input);
    return container;
}

function chipsOf(container: HTMLElement): ReadonlyArray<string> {
    return [...container.querySelectorAll("[data-select-chip]")].map(
        (chip) => chip.firstChild?.textContent ?? "",
    );
}

describe("SelectBoxChipPainter painting the trigger", () => {
    test("paints one chip per selection, in selection order", () => {
        const controller = new MultiSelectBoxController({ options: fruits });
        controller.commitValue(["lemon", "apple"]);
        const container = createTagsContainer();

        painterFor(controller).paintTriggerChips(container, controller.getState());

        expect(chipsOf(container)).toEqual(["Lemon", "Apple"]);
    });

    test("paints nothing in single mode, where the input shows the label", () => {
        const controller = new SingleSelectBoxController({ options: fruits });
        controller.commitValue("apple");
        const container = createTagsContainer();

        painterFor(controller).paintTriggerChips(container, controller.getState());

        expect(chipsOf(container)).toEqual([]);
    });

    test("keeps the input as the last child so typing continues after the chips", () => {
        const controller = new MultiSelectBoxController({ options: fruits });
        controller.commitValue(["apple", "pear"]);
        const container = createTagsContainer();

        painterFor(controller).paintTriggerChips(container, controller.getState());

        expect(container.lastElementChild?.getAttribute("data-select-input")).toBe("");
    });

    test("replaces the previous chips instead of stacking them", () => {
        const controller = new MultiSelectBoxController({ options: fruits });
        const painter = painterFor(controller);
        const container = createTagsContainer();

        controller.commitValue(["apple"]);
        painter.paintTriggerChips(container, controller.getState());
        controller.commitValue(["pear"]);
        painter.paintTriggerChips(container, controller.getState());

        expect(chipsOf(container)).toEqual(["Pear"]);
    });

    test("sweeps chips whose class a consumer restyled", () => {
        const controller = new MultiSelectBoxController({ options: fruits });
        const container = createTagsContainer();
        const stale = document.createElement("span");
        stale.dataset["selectChip"] = "";
        stale.className = "my-own-chip";
        container.prepend(stale);

        painterFor(controller).paintTriggerChips(container, controller.getState());

        expect(container.querySelectorAll("[data-select-chip]")).toHaveLength(0);
    });

    test("clears the chips once the selection is emptied", () => {
        const controller = new MultiSelectBoxController({ options: fruits });
        const painter = painterFor(controller);
        const container = createTagsContainer();

        controller.commitValue(["apple"]);
        painter.paintTriggerChips(container, controller.getState());
        controller.clear();
        painter.paintTriggerChips(container, controller.getState());

        expect(chipsOf(container)).toEqual([]);
    });

    test("appends the chips when the container holds no input", () => {
        const controller = new MultiSelectBoxController({ options: fruits });
        controller.commitValue(["apple"]);
        const container = document.createElement("div");

        painterFor(controller).paintTriggerChips(container, controller.getState());

        expect(chipsOf(container)).toEqual(["Apple"]);
    });
});

describe("SelectBoxChipPainter painting the inline surface", () => {
    function paintInline(
        controller: SelectBoxController<object, SelectionValue>,
    ): HTMLElement {
        const surface = document.createElement("div");
        const snapshot = controller.getState();
        painterFor(controller).paintInlineSurface(
            surface,
            snapshot,
            new SelectBoxSnapshotView(snapshot),
        );
        return surface;
    }

    test("renders every visible option as a chip", () => {
        const surface = paintInline(new MultiSelectBoxController({ options: fruits }));

        expect(surface.querySelectorAll("[data-select-chip]")).toHaveLength(fruits.length);
    });

    test("groups the chips under their header, in a tag row per group", () => {
        const surface = paintInline(new MultiSelectBoxController({ options: fruits }));

        const headers = [...surface.querySelectorAll("[data-select-group-label]")].map(
            (header) => header.textContent,
        );
        const rows = surface.querySelectorAll("[data-select-tags]");
        expect(headers).toEqual(["Pomes", "Citrus"]);
        expect(rows).toHaveLength(2);
        expect(rows[0]!.querySelectorAll("[data-select-chip]")).toHaveLength(2);
    });

    test("omits the header when the options carry no group", () => {
        const surface = paintInline(
            new MultiSelectBoxController({ options: [{ value: "a", label: "A" }] }),
        );

        expect(surface.querySelector("[data-select-group-label]")).toBeNull();
        expect(surface.querySelectorAll("[data-select-tags]")).toHaveLength(1);
    });

    test("announces multi-selectability to a screen reader", () => {
        const inMulti = paintInline(new MultiSelectBoxController({ options: fruits }));
        const inSingle = paintInline(new SingleSelectBoxController({ options: fruits }));

        expect(inMulti.getAttribute("aria-multiselectable")).toBe("true");
        expect(inSingle.hasAttribute("aria-multiselectable")).toBe(false);
    });

    test("drops the multi marker when the control goes back to single", () => {
        const controller = new MultiSelectBoxController({ options: fruits });
        const painter = painterFor(controller);
        const surface = document.createElement("div");
        const view = new SelectBoxSnapshotView(controller.getState());
        painter.paintInlineSurface(surface, controller.getState(), view);

        controller.setMode("single");
        painter.paintInlineSurface(
            surface,
            controller.getState(),
            new SelectBoxSnapshotView(controller.getState()),
        );

        expect(surface.hasAttribute("aria-multiselectable")).toBe(false);
    });

    test("marks the selected chips from the snapshot", () => {
        const controller = new MultiSelectBoxController({ options: fruits });
        controller.commitValue(["lemon"]);

        const surface = paintInline(controller);

        const selected = [...surface.querySelectorAll("[data-select-selected]")].map(
            (chip) => chip.textContent,
        );
        expect(selected).toEqual(["Lemon"]);
    });

    test("repaints from scratch rather than appending a second copy", () => {
        const controller = new MultiSelectBoxController({ options: fruits });
        const painter = painterFor(controller);
        const surface = document.createElement("div");
        const view = new SelectBoxSnapshotView(controller.getState());

        painter.paintInlineSurface(surface, controller.getState(), view);
        painter.paintInlineSurface(surface, controller.getState(), view);

        expect(surface.querySelectorAll("[data-select-chip]")).toHaveLength(fruits.length);
    });

    test("shows only the options that survived the query", () => {
        const controller = new MultiSelectBoxController({ options: fruits });
        controller.open();
        controller.setQuery("lem");

        const surface = paintInline(controller);

        expect(surface.querySelectorAll("[data-select-chip]")).toHaveLength(1);
    });
});
