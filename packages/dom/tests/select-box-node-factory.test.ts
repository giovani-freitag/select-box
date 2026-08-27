// @vitest-environment happy-dom
import {
    MultiSelectBoxController,
    SelectBoxSnapshotView,
    SingleSelectBoxController,
    type SelectBoxController,
    type SelectionValue,
    type SelectOption,
} from "@select-box/core";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { SelectBoxNodeFactory } from "../src/select-box-node-factory.js";

const fruits: ReadonlyArray<SelectOption> = [
    { value: "apple", label: "Apple" },
    { value: "pear", label: "Pear" },
    { value: "fig", label: "Fig", disabled: true },
];

const APPLE = fruits[0]!;
const FIG = fruits[2]!;

describe("SelectBoxNodeFactory", () => {
    let refocus: () => void;

    function build(
        controller: SelectBoxController<object, SelectionValue> | null,
    ): SelectBoxNodeFactory {
        return new SelectBoxNodeFactory({
            instanceId: "sb-1",
            getController: () => controller,
            refocus,
        });
    }

    function single(): SingleSelectBoxController {
        return new SingleSelectBoxController({ options: fruits });
    }

    function multi(): MultiSelectBoxController {
        return new MultiSelectBoxController({ options: fruits });
    }

    beforeEach(() => {
        refocus = vi.fn();
    });

    describe("group header", () => {
        test("carries the contract attribute and the label", () => {
            const header = build(single()).createGroupHeader("Pomes");

            expect(header.dataset["selectGroupLabel"]).toBe("");
            expect(header.className).toBe("select-box-group-label");
            expect(header.textContent).toBe("Pomes");
        });
    });

    describe("option row", () => {
        test("is a listbox option that is never a tab stop", () => {
            const row = build(single()).createOptionRow(APPLE, {
                active: false,
                selected: false,
            });

            expect(row.getAttribute("role")).toBe("option");
            expect(row.tabIndex).toBe(-1);
            expect(row.dataset["selectOption"]).toBe("");
        });

        test("derives its id from the instance and the option value", () => {
            const row = build(single()).createOptionRow(APPLE, {
                active: false,
                selected: false,
            });

            expect(row.id).toBe("sb-1-opt-apple");
        });

        test("marks the active row for CSS and for the contract", () => {
            const row = build(single()).createOptionRow(APPLE, {
                active: true,
                selected: false,
            });

            expect(row.classList.contains("select-box-option-active")).toBe(true);
            expect(row.dataset["selectActive"]).toBe("");
        });

        test("announces selection through aria and the contract", () => {
            const row = build(single()).createOptionRow(APPLE, {
                active: false,
                selected: true,
            });

            expect(row.getAttribute("aria-selected")).toBe("true");
            expect(row.dataset["selectSelected"]).toBe("");
        });

        test("keeps the selected class for multi, where selection is a toggle", () => {
            const inMulti = build(multi()).createOptionRow(APPLE, {
                active: false,
                selected: true,
            });
            const inSingle = build(single()).createOptionRow(APPLE, {
                active: false,
                selected: true,
            });

            expect(inMulti.classList.contains("select-box-option-selected")).toBe(true);
            expect(inSingle.classList.contains("select-box-option-selected")).toBe(false);
        });

        test("renders a tick only in multi mode", () => {
            const inMulti = build(multi()).createOptionRow(APPLE, {
                active: false,
                selected: true,
            });
            const inSingle = build(single()).createOptionRow(APPLE, {
                active: false,
                selected: true,
            });

            expect(inMulti.querySelector(".select-box-option-tick")?.textContent).toBe("✓");
            expect(inSingle.querySelector(".select-box-option-tick")).toBeNull();
        });

        test("marks a disabled option with the ARIA state rather than the native one", () => {
            const row = build(single()).createOptionRow(FIG, {
                active: false,
                selected: false,
            });

            expect(row.getAttribute("aria-disabled")).toBe("true");
            expect(row.disabled).toBe(false);
            expect(row.classList.contains("select-box-option-disabled")).toBe(true);
        });

        test("commits nothing when a disabled option is clicked anyway", () => {
            const controller = single();
            const row = build(controller).createOptionRow(FIG, {
                active: false,
                selected: false,
            });

            row.click();

            expect(controller.getState().value).toBeNull();
        });

        test("commits its option on click", () => {
            const controller = single();
            const row = build(controller).createOptionRow(APPLE, {
                active: false,
                selected: false,
            });

            row.click();

            expect(controller.getState().value).toBe("apple");
        });

        test("keeps focus on the input after a multi commit", () => {
            const row = build(multi()).createOptionRow(APPLE, {
                active: false,
                selected: false,
            });

            row.click();

            expect(refocus).toHaveBeenCalled();
        });

        test("leaves focus alone after a single commit, which closes the list", () => {
            const row = build(single()).createOptionRow(APPLE, {
                active: false,
                selected: false,
            });

            row.click();

            expect(refocus).not.toHaveBeenCalled();
        });

        test("swallows mousedown so the trigger keeps its focus", () => {
            const row = build(single()).createOptionRow(APPLE, {
                active: false,
                selected: false,
            });
            const event = new MouseEvent("mousedown", { cancelable: true });

            row.dispatchEvent(event);

            expect(event.defaultPrevented).toBe(true);
        });

        test("wraps the matched span of the label in a mark", () => {
            const controller = single();
            controller.open();
            controller.setQuery("pp");

            const row = build(controller).createOptionRow(APPLE, {
                active: false,
                selected: false,
            });

            expect(row.querySelector("mark.select-box-option-match")?.textContent).toBe("pp");
            expect(row.textContent).toBe("Apple");
        });

        test("renders a plain label when nothing is being searched", () => {
            const row = build(single()).createOptionRow(APPLE, {
                active: false,
                selected: false,
            });

            expect(row.querySelector("mark")).toBeNull();
            expect(row.textContent).toBe("Apple");
        });

        test("stays inert without a controller, rather than throwing", () => {
            const row = build(null).createOptionRow(APPLE, {
                active: false,
                selected: false,
            });

            expect(() => row.click()).not.toThrow();
            expect(row.textContent).toBe("Apple");
        });
    });

    describe("selected chip", () => {
        test("shows the label and a labelled remove control", () => {
            const chip = build(multi()).createSelectedChip(APPLE);
            const remove = chip.querySelector<HTMLButtonElement>("[data-select-chip-remove]");

            expect(chip.dataset["selectChip"]).toBe("");
            expect(chip.textContent).toBe("Apple×");
            expect(remove?.getAttribute("aria-label")).toBe("Remove Apple");
        });

        test("deselects its option and returns focus to the input", () => {
            const controller = multi();
            controller.commitValue(["apple", "pear"]);
            const chip = build(controller).createSelectedChip(APPLE);

            chip.querySelector<HTMLButtonElement>("[data-select-chip-remove]")!.click();

            expect(controller.getState().value).toEqual(["pear"]);
            expect(refocus).toHaveBeenCalled();
        });

        test("keeps the remove click from reaching the trigger", () => {
            const chip = build(multi()).createSelectedChip(APPLE);
            const trigger = document.createElement("div");
            trigger.append(chip);
            const seen = vi.fn();
            trigger.addEventListener("click", seen);
            trigger.addEventListener("mousedown", seen);
            const remove = chip.querySelector<HTMLButtonElement>("[data-select-chip-remove]")!;

            remove.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
            remove.dispatchEvent(new MouseEvent("click", { bubbles: true }));

            expect(seen).not.toHaveBeenCalled();
        });
    });

    describe("selectable chip", () => {
        test("reports its state through aria-selected and aria-pressed", () => {
            const chip = build(multi()).createSelectableChip(APPLE, { selected: true });

            expect(chip.getAttribute("aria-selected")).toBe("true");
            expect(chip.getAttribute("aria-pressed")).toBe("true");
            expect(chip.classList.contains("select-box-chip-selected")).toBe(true);
            expect(chip.dataset["selectSelected"]).toBe("");
        });

        test("answers both the option and the chip contract queries", () => {
            const chip = build(multi()).createSelectableChip(APPLE, { selected: false });

            expect(chip.dataset["selectOption"]).toBe("");
            expect(chip.dataset["selectChip"]).toBe("");
        });

        test("toggles its option on click", () => {
            const controller = multi();
            const factory = build(controller);

            factory.createSelectableChip(APPLE, { selected: false }).click();
            expect(controller.getState().value).toEqual(["apple"]);

            factory.createSelectableChip(APPLE, { selected: true }).click();
            expect(controller.getState().value).toEqual([]);
        });

        test("refuses a disabled option through the handler, not the native attribute", () => {
            const controller = multi();
            const chip = build(controller).createSelectableChip(FIG, { selected: false });

            chip.click();

            expect(chip.getAttribute("aria-disabled")).toBe("true");
            expect(chip.disabled).toBe(false);
            expect(controller.getState().value).toEqual([]);
        });

        test("mirrors a disabled control, which has no input to carry the state", () => {
            const controller = multi();
            controller.setInteractivity({ disabled: true, readOnly: false });

            const chip = build(controller).createSelectableChip(APPLE, { selected: false });

            expect(chip.getAttribute("aria-disabled")).toBe("true");
        });

        test("mirrors a read-only control the same way", () => {
            const controller = multi();
            controller.setInteractivity({ disabled: false, readOnly: true });

            const chip = build(controller).createSelectableChip(APPLE, { selected: false });

            expect(chip.getAttribute("aria-disabled")).toBe("true");
        });

        test("refuses the click a mirrored disabled state no longer blocks natively", () => {
            const controller = multi();
            controller.setInteractivity({ disabled: true, readOnly: false });
            const chip = build(controller).createSelectableChip(APPLE, { selected: false });

            chip.click();

            expect(controller.getState().value).toEqual([]);
        });

        test("stays enabled while the control accepts input", () => {
            const chip = build(multi()).createSelectableChip(APPLE, { selected: false });

            expect(chip.hasAttribute("aria-disabled")).toBe(false);
        });
    });

    describe("empty state", () => {
        test("carries the contract attribute and the given message", () => {
            const empty = build(single()).createEmptyState("Nada encontrado");

            expect(empty.dataset["selectEmpty"]).toBe("");
            expect(empty.className).toBe("select-box-empty");
            expect(empty.textContent).toBe("Nada encontrado");
        });
    });

    describe("mode changes", () => {
        test("a row built after a mode flip follows the new mode", () => {
            const controller = new SingleSelectBoxController({ options: fruits });
            const factory = build(controller);

            const beforeFlip = factory.createOptionRow(APPLE, {
                active: false,
                selected: true,
            });
            controller.setMode("multi");
            const afterFlip = factory.createOptionRow(APPLE, {
                active: false,
                selected: true,
            });

            expect(beforeFlip.querySelector(".select-box-option-tick")).toBeNull();
            expect(afterFlip.querySelector(".select-box-option-tick")).not.toBeNull();
        });
    });

    describe("snapshot view agreement", () => {
        test("a row's selected flag matches what the snapshot view reports", () => {
            const controller = multi();
            controller.commitValue(["pear"]);
            const view = new SelectBoxSnapshotView(controller.getState());

            const row = build(controller).createOptionRow(fruits[1]!, {
                active: false,
                selected: view.isSelected("pear"),
            });

            expect(row.getAttribute("aria-selected")).toBe("true");
        });
    });
});
