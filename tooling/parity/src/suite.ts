import { afterEach, describe, expect, test } from "vitest";

import {
    PARITY_FRUITS,
    PARITY_GROUPED_FRUITS,
    PARITY_PLACEHOLDER,
    PARITY_SWAPPED_FRUITS,
    type ParityAdapter,
    type ParityHandle,
} from "./adapter.js";

function input(handle: ParityHandle): HTMLInputElement {
    return handle.queryScope().querySelector<HTMLInputElement>("[data-select-input]")!;
}

/**
 * Whether an element is on offer to the user.
 *
 * Wrappers split on how they take something away — some drop the node, others
 * keep it and flip `hidden`, sometimes on an ancestor. All of it reads as
 * absent, so the suite grades behaviour instead of the structural choice.
 */
function isOffered(element: Element | null): boolean {
    let node = element;
    while (node !== null) {
        if (node instanceof HTMLElement && node.hidden) return false;
        node = node.parentElement;
    }
    return element !== null;
}

function isOpen(handle: ParityHandle): boolean {
    return isOffered(handle.queryScope().querySelector("[data-select-popover]"));
}

function optionLabels(handle: ParityHandle): ReadonlyArray<string> {
    if (!isOpen(handle)) return [];
    return [...handle.queryScope().querySelectorAll("[data-select-option]")].map((option) =>
        (option.textContent ?? "").replace("✓", "").trim(),
    );
}

function optionByLabel(handle: ParityHandle, label: string): Element {
    return [...handle.queryScope().querySelectorAll("[data-select-option]")].find((option) =>
        (option.textContent ?? "").includes(label),
    )!;
}

function groupLabels(handle: ParityHandle): ReadonlyArray<string> {
    if (!isOpen(handle)) return [];
    return [...handle.queryScope().querySelectorAll("[data-select-group-label]")].map((label) =>
        (label.textContent ?? "").trim(),
    );
}

function inlineChips(handle: ParityHandle): ReadonlyArray<Element> {
    return [...handle.queryScope().querySelectorAll("[data-select-chip]")];
}

function selectedChipLabels(handle: ParityHandle): ReadonlyArray<string> {
    return [...handle.queryScope().querySelectorAll("[data-select-chip][data-select-selected]")].map(
        (chip) => (chip.textContent ?? "").trim(),
    );
}

function chipLabels(handle: ParityHandle): ReadonlyArray<string> {
    return [...handle.queryScope().querySelectorAll("[data-select-chip]")].map((chip) =>
        (chip.textContent ?? "").replace("×", "").trim(),
    );
}

/**
 * The caret as the user meets it, or null when it is not on offer.
 *
 * Same split as the clear control: dropped from the tree by some wrappers,
 * flagged `hidden` by others.
 */
function caretControl(handle: ParityHandle): HTMLElement | null {
    const button = handle.queryScope().querySelector<HTMLElement>("[data-select-caret]");
    return isOffered(button) ? button : null;
}

/**
 * The clear control as the user meets it, or null when it is not on offer.
 *
 * Wrappers split the same way they do on the popover: some drop the node,
 * others keep it and flip `hidden`. Asserting on the tree alone would grade
 * that choice instead of the behaviour.
 */
function clearControl(handle: ParityHandle): HTMLElement | null {
    const button = handle.queryScope().querySelector<HTMLElement>("[data-select-clear]");
    return isOffered(button) ? button : null;
}

/**
 * Registers the behaviour every wrapper owes its users, driven entirely through
 * the `data-select-*` contract.
 *
 * Scope is deliberately the shared UX: what a user sees and can do. Each
 * wrapper's own idiomatic surface — props, emits, attributes, plugin methods —
 * stays in that package's suites, because those signatures are meant to differ.
 */
export function describeParitySuite(adapter: ParityAdapter): void {
    describe(`cross-wrapper parity (${adapter.name})`, () => {
        let handle: ParityHandle | null = null;

        afterEach(async () => {
            await handle?.unmount();
            handle = null;
        });

        async function mountSingle(): Promise<ParityHandle> {
            handle = await adapter.mount({
                options: PARITY_FRUITS,
                placeholder: PARITY_PLACEHOLDER,
                multi: false,
                surface: "popover",
            });
            return handle;
        }

        async function mountGrouped(): Promise<ParityHandle> {
            handle = await adapter.mount({
                options: PARITY_GROUPED_FRUITS,
                placeholder: PARITY_PLACEHOLDER,
                multi: false,
                surface: "popover",
            });
            return handle;
        }

        async function mountMulti(): Promise<ParityHandle> {
            handle = await adapter.mount({
                options: PARITY_FRUITS,
                placeholder: PARITY_PLACEHOLDER,
                multi: true,
                surface: "popover",
            });
            return handle;
        }

        async function mountInline(options: {
            readonly multi: boolean;
            readonly grouped?: boolean;
        }): Promise<ParityHandle> {
            handle = await adapter.mount({
                options: options.grouped === true ? PARITY_GROUPED_FRUITS : PARITY_FRUITS,
                placeholder: PARITY_PLACEHOLDER,
                multi: options.multi,
                surface: "inline",
            });
            return handle;
        }

        test("renders the placeholder with an empty input", async () => {
            const mounted = await mountSingle();

            expect(input(mounted).placeholder).toBe(PARITY_PLACEHOLDER);
            expect(input(mounted).value).toBe("");
        });

        test("focusing the input opens the popover", async () => {
            const mounted = await mountSingle();

            await mounted.focusInput();

            expect(isOpen(mounted)).toBe(true);
        });

        test("typing narrows the option list", async () => {
            const mounted = await mountSingle();
            await mounted.focusInput();

            await mounted.typeIntoInput("ear");

            expect(optionLabels(mounted)).toEqual(["Pear"]);
        });

        test("Enter commits the active option and closes the popover", async () => {
            const mounted = await mountSingle();
            await mounted.focusInput();

            await mounted.pressKey("Enter");

            expect(input(mounted).value).toBe("Apple");
            expect(isOpen(mounted)).toBe(false);
        });

        test("Escape closes the popover and commits nothing", async () => {
            const mounted = await mountSingle();
            await mounted.focusInput();

            await mounted.pressKey("Escape");

            expect(isOpen(mounted)).toBe(false);
            expect(input(mounted).value).toBe("");
        });

        test("clicking an option commits its label into the input", async () => {
            const mounted = await mountSingle();
            await mounted.focusInput();

            await mounted.clickElement(optionByLabel(mounted, "Grape"));

            expect(input(mounted).value).toBe("Grape");
        });

        test("a mousedown outside closes the popover", async () => {
            const mounted = await mountSingle();
            await mounted.focusInput();

            await mounted.clickOutside();

            expect(isOpen(mounted)).toBe(false);
        });

        test("renders a header per group when options carry group keys", async () => {
            const mounted = await mountGrouped();

            await mounted.focusInput();

            expect(groupLabels(mounted)).toEqual(["Pomes", "Berries"]);
        });

        test("drops the header of a group filtered down to nothing", async () => {
            const mounted = await mountGrouped();
            await mounted.focusInput();

            await mounted.typeIntoInput("rap");

            expect(groupLabels(mounted)).toEqual(["Berries"]);
        });

        async function mountWithFlags(flags: {
            readonly disabled?: boolean;
            readonly readOnly?: boolean;
        }): Promise<ParityHandle> {
            handle = await adapter.mount({
                options: PARITY_FRUITS,
                placeholder: PARITY_PLACEHOLDER,
                multi: false,
                surface: "popover",
                ...flags,
            });
            return handle;
        }

        test("a disabled control refuses to open", async () => {
            const mounted = await mountWithFlags({ disabled: true });

            await mounted.focusInput();

            expect(isOpen(mounted)).toBe(false);
            expect(input(mounted).disabled).toBe(true);
        });

        test("a read-only control refuses to open and stays enabled", async () => {
            const mounted = await mountWithFlags({ readOnly: true });

            await mounted.focusInput();

            expect(isOpen(mounted)).toBe(false);
            expect(input(mounted).disabled).toBe(false);
            expect(input(mounted).readOnly).toBe(true);
        });

        test("a read-only control refuses a commit driven through the controller", async () => {
            const mounted = await mountWithFlags({ readOnly: true });

            mounted.publicController()!.open();
            await mounted.settle();

            expect(isOpen(mounted)).toBe(false);
        });

        test("swapping the options renders the new list", async () => {
            const mounted = await mountSingle();
            await mounted.focusInput();

            await mounted.setOptions(PARITY_SWAPPED_FRUITS);

            expect(optionLabels(mounted)).toEqual(["Pear", "Fig", "Date"]);
        });

        test("swapping the options keeps a selection the new list still offers", async () => {
            const mounted = await mountSingle();
            await mounted.focusInput();
            await mounted.clickElement(optionByLabel(mounted, "Pear"));

            await mounted.setOptions(PARITY_SWAPPED_FRUITS);

            expect(input(mounted).value).toBe("Pear");
        });

        test("swapping the options drops a selection the new list no longer offers", async () => {
            const mounted = await mountSingle();
            await mounted.focusInput();
            await mounted.clickElement(optionByLabel(mounted, "Apple"));

            await mounted.setOptions(PARITY_SWAPPED_FRUITS);

            expect(input(mounted).value).toBe("");
        });

        test("hands over the live controller, not a copy", async () => {
            const mounted = await mountSingle();
            expect(isOpen(mounted)).toBe(false);

            mounted.publicController()!.open();
            await mounted.settle();

            expect(isOpen(mounted)).toBe(true);
        });

        test("marks its root with the mode, so stylesheets can branch on it", async () => {
            await mountMulti();

            expect(
                document.querySelector("[data-select-root]")?.getAttribute("data-select-mode"),
            ).toBe("multi");
        });

        test("hands that same root over through its own public API", async () => {
            const mounted = await mountSingle();

            expect(mounted.publicRoot()).toBe(document.querySelector("[data-select-root]"));
        });

        test("marks exactly one node as the select-box root", async () => {
            await mountSingle();

            expect(document.querySelectorAll("[data-select-root]")).toHaveLength(1);
        });

        test("offers a caret in single mode", async () => {
            const mounted = await mountSingle();

            expect(caretControl(mounted)).not.toBeNull();
        });

        test("offers no caret in multi mode, where chips carry the affordance", async () => {
            const mounted = await mountMulti();

            expect(caretControl(mounted)).toBeNull();
        });

        test("offers no clear control while nothing is selected", async () => {
            const mounted = await mountMulti();

            expect(clearControl(mounted)).toBeNull();
        });

        test("clicking an option adds a chip and keeps the popover open", async () => {
            const mounted = await mountMulti();
            await mounted.focusInput();

            await mounted.clickElement(optionByLabel(mounted, "Apple"));

            expect(chipLabels(mounted)).toEqual(["Apple"]);
            expect(isOpen(mounted)).toBe(true);
        });

        test("clicking the same option twice drops its chip", async () => {
            const mounted = await mountMulti();
            await mounted.focusInput();
            await mounted.clickElement(optionByLabel(mounted, "Apple"));

            await mounted.clickElement(optionByLabel(mounted, "Apple"));

            expect(chipLabels(mounted)).toEqual([]);
        });

        test("the clear control appears with a selection and empties it", async () => {
            const mounted = await mountMulti();
            await mounted.focusInput();
            await mounted.clickElement(optionByLabel(mounted, "Apple"));
            expect(clearControl(mounted)).not.toBeNull();

            await mounted.clickElement(clearControl(mounted)!);

            expect(chipLabels(mounted)).toEqual([]);
            expect(clearControl(mounted)).toBeNull();
        });

        test("typing narrows the list without dropping chips", async () => {
            const mounted = await mountMulti();
            await mounted.focusInput();
            await mounted.clickElement(optionByLabel(mounted, "Apple"));

            await mounted.typeIntoInput("rap");

            expect(optionLabels(mounted)).toEqual(["Grape"]);
            expect(chipLabels(mounted)).toEqual(["Apple"]);
        });

        test("a chip's remove control drops only that chip", async () => {
            const mounted = await mountMulti();
            await mounted.focusInput();
            await mounted.clickElement(optionByLabel(mounted, "Apple"));
            await mounted.clickElement(optionByLabel(mounted, "Pear"));

            await mounted.clickElement(
                mounted.queryScope().querySelector("[data-select-chip-remove]")!,
            );

            expect(chipLabels(mounted)).toEqual(["Pear"]);
        });

        describe("inline surface", () => {
            test("renders one chip per option, with no popover and no trigger input", async () => {
                const mounted = await mountInline({ multi: false });

                expect(inlineChips(mounted)).toHaveLength(PARITY_FRUITS.length);
                expect(isOpen(mounted)).toBe(false);
                expect(
                    isOffered(mounted.queryScope().querySelector("[data-select-input]")),
                ).toBe(false);
            });

            test("marks itself as the inline surface", async () => {
                const mounted = await mountInline({ multi: false });

                expect(
                    mounted.queryScope().querySelector("[data-select-surface='inline']"),
                ).not.toBeNull();
            });

            test("hands its root over through its own public API", async () => {
                const mounted = await mountInline({ multi: false });

                expect(mounted.publicRoot()).toBe(document.querySelector("[data-select-root]"));
            });

            test("clicking a chip selects it", async () => {
                const mounted = await mountInline({ multi: false });

                await mounted.clickElement(inlineChips(mounted)[0]!);

                expect(selectedChipLabels(mounted)).toEqual(["Apple"]);
            });

            test("single mode keeps one chip selected at a time", async () => {
                const mounted = await mountInline({ multi: false });
                await mounted.clickElement(inlineChips(mounted)[0]!);

                await mounted.clickElement(inlineChips(mounted)[2]!);

                expect(selectedChipLabels(mounted)).toEqual(["Grape"]);
            });

            test("multi mode accumulates selected chips", async () => {
                const mounted = await mountInline({ multi: true });
                await mounted.clickElement(inlineChips(mounted)[0]!);

                await mounted.clickElement(inlineChips(mounted)[2]!);

                expect(selectedChipLabels(mounted)).toEqual(["Apple", "Grape"]);
            });

            test("multi mode deselects a chip clicked twice", async () => {
                const mounted = await mountInline({ multi: true });
                await mounted.clickElement(inlineChips(mounted)[0]!);

                await mounted.clickElement(inlineChips(mounted)[0]!);

                expect(selectedChipLabels(mounted)).toEqual([]);
            });

            test("renders a header per group when options carry group keys", async () => {
                const mounted = await mountInline({ multi: false, grouped: true });

                expect(
                    [...mounted.queryScope().querySelectorAll("[data-select-group-label]")].map(
                        (label) => (label.textContent ?? "").trim(),
                    ),
                ).toEqual(["Pomes", "Berries"]);
            });
        });
    });
}
