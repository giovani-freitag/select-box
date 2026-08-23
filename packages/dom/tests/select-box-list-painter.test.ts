// @vitest-environment happy-dom
import {
    MultiSelectBoxController,
    SelectBoxSnapshotView,
    SingleSelectBoxController,
    type SelectBoxController,
    type SelectionValue,
    type SelectOption,
} from "@select-box/core";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { SelectBoxListPainter } from "../src/select-box-list-painter.js";
import { SelectBoxNodeFactory } from "../src/select-box-node-factory.js";

const fruits: ReadonlyArray<SelectOption> = [
    { value: "apple", label: "Apple", group: "Pomes" },
    { value: "pear", label: "Pear", group: "Pomes" },
    { value: "lemon", label: "Lemon", group: "Citrus" },
];

function manyOptions(count: number): ReadonlyArray<SelectOption> {
    return Array.from({ length: count }, (_unused, index) => ({
        value: `option-${index}`,
        label: `Option ${index}`,
    }));
}

describe("SelectBoxListPainter", () => {
    let list: HTMLElement;
    let onWindowChange: () => void;

    function paint(
        painter: SelectBoxListPainter,
        controller: SelectBoxController<object, SelectionValue>,
    ): void {
        const snapshot = controller.getState();
        painter.paint(snapshot, new SelectBoxSnapshotView(snapshot));
    }

    function painterFor(
        controller: SelectBoxController<object, SelectionValue>,
        overrides: { readonly getListElement?: () => HTMLElement | null } = {},
    ): SelectBoxListPainter {
        return new SelectBoxListPainter({
            factory: new SelectBoxNodeFactory({
                instanceId: "sb-1",
                getController: () => controller,
                refocus: () => undefined,
            }),
            getListElement: overrides.getListElement ?? (() => list),
            onWindowChange,
        });
    }

    function rowLabels(): ReadonlyArray<string> {
        return [...list.querySelectorAll("[data-select-option]")].map(
            (row) => row.textContent ?? "",
        );
    }

    beforeEach(() => {
        list = document.createElement("div");
        document.body.append(list);
        onWindowChange = vi.fn();
    });

    afterEach(() => {
        list.remove();
        vi.restoreAllMocks();
    });

    test("paints a row per option and a header per group", () => {
        const controller = new SingleSelectBoxController({ options: fruits });
        const painter = painterFor(controller);
        painter.mount();

        paint(painter, controller);

        expect(rowLabels()).toEqual(["Apple", "Pear", "Lemon"]);
        expect(list.querySelectorAll("[data-select-group-label]")).toHaveLength(2);
        painter.dispose();
    });

    test("keys every row by its virtual index, which the measurer reads back", () => {
        const controller = new SingleSelectBoxController({ options: fruits });
        const painter = painterFor(controller);
        painter.mount();

        paint(painter, controller);

        const indexes = [...list.querySelectorAll("[data-index]")].map(
            (row) => row.getAttribute("data-index"),
        );
        expect(indexes).toEqual(["0", "1", "2", "3", "4"]);
        painter.dispose();
    });

    test("shows the empty state when the query matches nothing", () => {
        const controller = new SingleSelectBoxController({ options: fruits });
        const painter = painterFor(controller);
        painter.mount();
        controller.open();
        controller.setQuery("zzz");

        paint(painter, controller);

        expect(list.querySelector("[data-select-empty]")?.textContent).toBe("No matches");
        expect(rowLabels()).toEqual([]);
        painter.dispose();
    });

    test("takes a localized empty message", () => {
        const controller = new SingleSelectBoxController({ options: fruits });
        const painter = new SelectBoxListPainter({
            factory: new SelectBoxNodeFactory({
                instanceId: "sb-1",
                getController: () => controller,
                refocus: () => undefined,
            }),
            getListElement: () => list,
            onWindowChange,
            emptyMessage: "Nada encontrado",
        });
        painter.mount();
        controller.open();
        controller.setQuery("zzz");

        paint(painter, controller);

        expect(list.querySelector("[data-select-empty]")?.textContent).toBe(
            "Nada encontrado",
        );
        painter.dispose();
    });

    test("recovers from the empty state on the next paint", () => {
        const controller = new SingleSelectBoxController({ options: fruits });
        const painter = painterFor(controller);
        painter.mount();
        controller.open();
        controller.setQuery("zzz");
        paint(painter, controller);

        controller.setQuery("");
        paint(painter, controller);

        expect(list.querySelector("[data-select-empty]")).toBeNull();
        expect(rowLabels()).toEqual(["Apple", "Pear", "Lemon"]);
        painter.dispose();
    });

    test("reuses its inner wrapper across paints", () => {
        const controller = new SingleSelectBoxController({ options: fruits });
        const painter = painterFor(controller);
        painter.mount();

        paint(painter, controller);
        const first = list.firstElementChild;
        paint(painter, controller);

        expect(list.children).toHaveLength(1);
        expect(list.firstElementChild).toBe(first);
        painter.dispose();
    });

    test("rebuilds the wrapper when something else replaced the list content", () => {
        const controller = new SingleSelectBoxController({ options: fruits });
        const painter = painterFor(controller);
        painter.mount();
        paint(painter, controller);

        list.replaceChildren();
        paint(painter, controller);

        expect(rowLabels()).toEqual(["Apple", "Pear", "Lemon"]);
        painter.dispose();
    });

    test("follows the query, dropping the rows it filtered out", () => {
        const controller = new SingleSelectBoxController({ options: fruits });
        const painter = painterFor(controller);
        painter.mount();
        controller.open();

        controller.setQuery("lem");
        paint(painter, controller);

        expect(rowLabels()).toEqual(["Lemon"]);
        painter.dispose();
    });

    test("marks the active row so the keyboard cursor is visible", () => {
        const controller = new SingleSelectBoxController({ options: fruits });
        const painter = painterFor(controller);
        painter.mount();
        controller.open();
        controller.moveActive(1);

        paint(painter, controller);

        expect(list.querySelector("[data-select-active]")?.textContent).toBe("Pear");
        painter.dispose();
    });

    test("marks the selected row from the snapshot view", () => {
        const controller = new MultiSelectBoxController({ options: fruits });
        const painter = painterFor(controller);
        painter.mount();
        controller.commitValue(["lemon"]);

        paint(painter, controller);

        expect(list.querySelector("[data-select-selected]")?.textContent).toBe("✓Lemon");
        painter.dispose();
    });

    test("renders only a window of a long list, not every option", () => {
        const controller = new SingleSelectBoxController({ options: manyOptions(5_000) });
        const painter = painterFor(controller);
        painter.mount();

        paint(painter, controller);

        const painted = list.querySelectorAll("[data-select-option]").length;
        expect(painted).toBeGreaterThan(0);
        expect(painted).toBeLessThan(50);
        painter.dispose();
    });

    test("pads the wrapper so the scrollbar spans the whole list", () => {
        const controller = new SingleSelectBoxController({ options: manyOptions(5_000) });
        const painter = painterFor(controller);
        painter.mount();

        paint(painter, controller);

        const wrapper = list.firstElementChild as HTMLElement;
        expect(Number.parseInt(wrapper.style.paddingBottom, 10)).toBeGreaterThan(1_000);
        painter.dispose();
    });

    test("scrolls the active row into view once, not on every paint", () => {
        const controller = new SingleSelectBoxController({ options: manyOptions(500) });
        const painter = painterFor(controller);
        painter.mount();
        controller.open();
        const scrolled = vi.spyOn(list, "scrollTop", "set");

        for (let step = 0; step < 40; step += 1) controller.moveActive(1);
        paint(painter, controller);
        const afterMove = scrolled.mock.calls.length;
        paint(painter, controller);

        expect(afterMove).toBeGreaterThan(0);
        expect(scrolled.mock.calls).toHaveLength(afterMove);
        painter.dispose();
    });

    test("does nothing at all before its list element exists", () => {
        const controller = new SingleSelectBoxController({ options: fruits });
        const painter = painterFor(controller, { getListElement: () => null });
        painter.mount();

        expect(() => paint(painter, controller)).not.toThrow();
        expect(rowLabels()).toEqual([]);
        painter.dispose();
    });

    test("asks for a repaint when the visible window moves", () => {
        const controller = new SingleSelectBoxController({ options: manyOptions(5_000) });
        const painter = painterFor(controller);
        painter.mount();
        paint(painter, controller);
        (onWindowChange as ReturnType<typeof vi.fn>).mockClear();

        list.scrollTop = 2_000;
        list.dispatchEvent(new Event("scroll"));

        expect(onWindowChange).toHaveBeenCalled();
        painter.dispose();
    });

    test("stops asking for repaints once disposed", () => {
        const controller = new SingleSelectBoxController({ options: manyOptions(5_000) });
        const painter = painterFor(controller);
        painter.mount();
        paint(painter, controller);

        painter.dispose();
        (onWindowChange as ReturnType<typeof vi.fn>).mockClear();
        list.scrollTop = 2_000;
        list.dispatchEvent(new Event("scroll"));

        expect(onWindowChange).not.toHaveBeenCalled();
    });

    test("mounting twice leaves one working subscription behind", () => {
        const controller = new SingleSelectBoxController({ options: manyOptions(5_000) });
        const painter = painterFor(controller);
        painter.mount();
        painter.mount();
        paint(painter, controller);
        (onWindowChange as ReturnType<typeof vi.fn>).mockClear();

        list.scrollTop = 2_000;
        list.dispatchEvent(new Event("scroll"));
        const whileMounted = (onWindowChange as ReturnType<typeof vi.fn>).mock.calls.length;
        painter.dispose();
        list.scrollTop = 4_000;
        list.dispatchEvent(new Event("scroll"));

        expect(whileMounted).toBeGreaterThan(0);
        expect(onWindowChange).toHaveBeenCalledTimes(whileMounted);
    });

    test("paints again after a dispose and a fresh mount", () => {
        const controller = new SingleSelectBoxController({ options: fruits });
        const painter = painterFor(controller);
        painter.mount();
        paint(painter, controller);
        painter.dispose();

        painter.mount();
        paint(painter, controller);

        expect(rowLabels()).toEqual(["Apple", "Pear", "Lemon"]);
        painter.dispose();
    });

    test("asks for repaints again after being re-mounted", () => {
        const controller = new SingleSelectBoxController({ options: manyOptions(5_000) });
        const painter = painterFor(controller);
        painter.mount();
        paint(painter, controller);
        painter.dispose();

        painter.mount();
        paint(painter, controller);
        (onWindowChange as ReturnType<typeof vi.fn>).mockClear();
        list.scrollTop = 2_000;
        list.dispatchEvent(new Event("scroll"));

        expect(onWindowChange).toHaveBeenCalled();
        painter.dispose();
    });

    test("caps the list at the viewport height it reports", () => {
        const controller = new SingleSelectBoxController({ options: fruits });
        const painter = painterFor(controller);

        expect(painter.viewportHeight).toBe(240);
    });

    test("honours a configured viewport height", () => {
        const controller = new SingleSelectBoxController({ options: fruits });
        const painter = new SelectBoxListPainter({
            factory: new SelectBoxNodeFactory({
                instanceId: "sb-1",
                getController: () => controller,
                refocus: () => undefined,
            }),
            getListElement: () => list,
            onWindowChange,
            viewportHeight: 120,
        });

        expect(painter.viewportHeight).toBe(120);
    });

    test("picks up options added at runtime", () => {
        const controller = new SingleSelectBoxController({ options: fruits });
        const painter = painterFor(controller);
        painter.mount();
        paint(painter, controller);

        controller.setOptions([{ value: "fig", label: "Fig" }]);
        paint(painter, controller);

        expect(rowLabels()).toEqual(["Fig"]);
        painter.dispose();
    });

    test("commits the option whose row was clicked", () => {
        const controller = new SingleSelectBoxController({ options: fruits });
        const painter = painterFor(controller);
        painter.mount();
        paint(painter, controller);

        list.querySelectorAll<HTMLButtonElement>("[data-select-option]")[1]!.click();

        expect(controller.getState().value).toBe("pear");
        painter.dispose();
    });
});
