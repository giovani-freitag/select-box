import { afterEach, describe, expect, test } from "vitest";

import {
    PARITY_FRUITS,
    PARITY_FRUITS_WITH_DISABLED,
    PARITY_GROUPED_FRUITS,
    PARITY_PLACEHOLDER,
    PARITY_SWAPPED_FRUITS,
    type ParityAddon,
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
                multiple: false,
                surface: "popover",
            });
            return handle;
        }

        async function mountGrouped(): Promise<ParityHandle> {
            handle = await adapter.mount({
                options: PARITY_GROUPED_FRUITS,
                placeholder: PARITY_PLACEHOLDER,
                multiple: false,
                surface: "popover",
            });
            return handle;
        }

        async function mountMulti(): Promise<ParityHandle> {
            handle = await adapter.mount({
                options: PARITY_FRUITS,
                placeholder: PARITY_PLACEHOLDER,
                multiple: true,
                surface: "popover",
            });
            return handle;
        }

        async function mountInline(options: {
            readonly multiple: boolean;
            readonly grouped?: boolean;
        }): Promise<ParityHandle> {
            handle = await adapter.mount({
                options: options.grouped === true ? PARITY_GROUPED_FRUITS : PARITY_FRUITS,
                placeholder: PARITY_PLACEHOLDER,
                multiple: options.multiple,
                surface: "inline",
            });
            return handle;
        }

        test("respects an explicitly empty placeholder", async () => {
            handle = await adapter.mount({
                options: PARITY_FRUITS,
                placeholder: "",
                multiple: false,
                surface: "popover",
            });

            // A wrapper that treats "" as absent falls back to its own default,
            // which a consumer cannot then turn off.
            expect(input(handle).placeholder).toBe("");
        });

        test("accepts a selection set through its own public API", async () => {
            const mounted = await mountSingle();

            await mounted.setValue("grape");

            expect(input(mounted).value).toBe("Grape");
        });

        // The set of things a wrapper announces is decided once, in the core:
        // a committed selection changed, and nothing else. A wrapper may add an
        // event of its own where its ecosystem needs one, but it may not split
        // this one by mode — a listener would then have to know which of two
        // names its instance is going to use. These three scenarios are what
        // hold that line across all five.
        test("reports a commit to whatever the wrapper calls its change hook", async () => {
            const mounted = await mountSingle();
            await mounted.focusInput();

            await mounted.clickElement(optionByLabel(mounted, "Pear"));

            expect(mounted.reportedChanges()).toContain("pear");
        });

        test("reports a multi commit through that same hook, not a second one", async () => {
            const mounted = await mountMulti();
            await mounted.focusInput();

            await mounted.clickElement(optionByLabel(mounted, "Pear"));

            expect(mounted.reportedChanges()).toHaveLength(1);
            expect(mounted.reportedChanges()[0]).toEqual(["pear"]);
        });

        test("announces a commit once, not once per listener it could have used", async () => {
            const mounted = await mountSingle();
            await mounted.focusInput();

            await mounted.clickElement(optionByLabel(mounted, "Pear"));

            expect(mounted.reportedChanges()).toEqual(["pear"]);
        });

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
                multiple: false,
                surface: "popover",
                ...flags,
            });
            return handle;
        }

        // The role is already overridden to `option`, so the disabled state
        // belongs in ARIA beside it rather than in the native attribute. That
        // also means the platform no longer swallows the click, so the refusal
        // has to be explicit in code.
        test("marks a disabled option with the ARIA state, not the native attribute", async () => {
            handle = await adapter.mount({
                options: PARITY_FRUITS_WITH_DISABLED,
                placeholder: PARITY_PLACEHOLDER,
                multiple: false,
                surface: "popover",
            });
            const mounted = handle;
            await mounted.focusInput();

            const row = optionByLabel(mounted, "Pear");

            expect(row).toBeInstanceOf(HTMLButtonElement);
            expect(row.getAttribute("aria-disabled")).toBe("true");
            expect((row as HTMLButtonElement).disabled).toBe(false);
        });

        test("commits nothing when a disabled option is clicked anyway", async () => {
            handle = await adapter.mount({
                options: PARITY_FRUITS_WITH_DISABLED,
                placeholder: PARITY_PLACEHOLDER,
                multiple: false,
                surface: "popover",
            });
            const mounted = handle;
            await mounted.focusInput();

            await mounted.clickElement(optionByLabel(mounted, "Pear"));

            expect(input(mounted).value).toBe("");
        });

        // The addons insist the consumer passes translated text and stay
        // locale-agnostic; a wrapper that hardcodes English undoes that.
        test("shows the empty-state text the consumer supplied", async () => {
            handle = await adapter.mount({
                options: PARITY_FRUITS,
                placeholder: PARITY_PLACEHOLDER,
                multiple: false,
                surface: "popover",
                emptyMessage: "Nada encontrado",
            });
            const mounted = handle;
            await mounted.focusInput();

            await mounted.typeIntoInput("zzz");

            expect(
                mounted.queryScope().querySelector("[data-select-empty]")?.textContent?.trim(),
            ).toBe("Nada encontrado");
        });

        // A `<div>` between a listbox and its options is not a valid child and is
        // dropped from the accessibility tree, which left the grouping visible on
        // screen and absent to a screen reader — against the optgroup parity the
        // README promises.
        test("wraps each labelled run of rows in a named group", async () => {
            const mounted = await mountGrouped();
            await mounted.focusInput();

            const groups = [...mounted.queryScope().querySelectorAll("[data-select-group]")].filter(
                (group) => group.getAttribute("role") === "group",
            );

            expect(groups.map((group) => group.getAttribute("aria-label"))).toEqual([
                "Pomes",
                "Berries",
            ]);
        });

        test("keeps the option rows inside the group that names them", async () => {
            const mounted = await mountGrouped();
            await mounted.focusInput();

            const first = mounted
                .queryScope()
                .querySelector("[data-select-group][role='group']");

            expect(first?.querySelectorAll("[data-select-option]").length).toBeGreaterThan(0);
        });

        test("reports an empty state when the query matches nothing", async () => {
            const mounted = await mountSingle();
            await mounted.focusInput();

            await mounted.typeIntoInput("zzz");

            expect(optionLabels(mounted)).toEqual([]);
            expect(mounted.queryScope().querySelector("[data-select-empty]")).not.toBeNull();
        });

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

        test("a read-only control refuses a keyboard commit", async () => {
            const mounted = await mountWithFlags({ readOnly: true });

            await mounted.pressKey("ArrowDown");
            await mounted.pressKey("Enter");

            expect(input(mounted).value).toBe("");
            expect(mounted.reportedChanges()).toEqual([]);
        });

        // The flags refuse the user, not the page. A disabled `<select>` still
        // takes what its owner assigns, and a control that could not be given a
        // value while disabled could never render as a filled, read-only field.
        test("a disabled control still takes a value set by its owner", async () => {
            const mounted = await mountWithFlags({ disabled: true });

            await mounted.setValue("grape");

            expect(input(mounted).value).toBe("Grape");
        });

        test("a read-only control still takes a value set by its owner", async () => {
            const mounted = await mountWithFlags({ readOnly: true });

            await mounted.setValue("grape");

            expect(input(mounted).value).toBe("Grape");
        });

        test("detaches its addons when the instance goes away", async () => {
            let detached = 0;
            handle = await adapter.mount({
                options: PARITY_FRUITS,
                placeholder: PARITY_PLACEHOLDER,
                multiple: false,
                surface: "popover",
                addons: [
                    {
                        name: "probe",
                        detach: () => {
                            detached += 1;
                        },
                    },
                ],
            });

            await handle.unmount();
            handle = null;

            expect(detached).toBe(1);
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

        async function mountWithAddon(addon: ParityAddon): Promise<ParityHandle> {
            handle = await adapter.mount({
                options: PARITY_FRUITS,
                placeholder: PARITY_PLACEHOLDER,
                multiple: false,
                surface: "popover",
                addons: [addon],
            });
            return handle;
        }

        test("points the combobox at the highlighted row by id", async () => {
            const mounted = await mountSingle();
            await mounted.focusInput();

            await mounted.pressKey("ArrowDown");

            const combobox = mounted.queryScope().querySelector("[role='combobox']")!;
            const pointed = combobox.getAttribute("aria-activedescendant");
            const active = mounted.queryScope().querySelector("[data-select-active]");

            // Without this a screen reader announces nothing while the arrow keys
            // move the highlight, since focus never leaves the combobox.
            expect(pointed).not.toBeNull();
            expect(active).not.toBeNull();
            expect(active!.id).toBe(pointed);
        });

        test("drops aria-activedescendant when nothing is highlighted", async () => {
            const mounted = await mountSingle();

            const combobox = mounted.queryScope().querySelector("[role='combobox']")!;

            expect(combobox.getAttribute("aria-activedescendant")).toBeNull();
        });

        test("names the combobox with the label a consumer asked for", async () => {
            handle = await adapter.mount({
                options: PARITY_FRUITS,
                placeholder: PARITY_PLACEHOLDER,
                multiple: false,
                surface: "popover",
                ariaLabel: "Fruit picker",
            });
            const mounted = handle;

            const combobox = mounted.queryScope().querySelector("[role='combobox']");

            expect(combobox).not.toBeNull();
            expect(combobox!.getAttribute("aria-label")).toBe("Fruit picker");
        });

        test("keeps aria-expanded on the combobox and nowhere else", async () => {
            const mounted = await mountSingle();
            await mounted.focusInput();

            const announcing = [
                ...mounted.queryScope().querySelectorAll("[aria-expanded]"),
            ];

            expect(announcing).toHaveLength(1);
            expect(announcing[0]!.getAttribute("role")).toBe("combobox");
            expect(announcing[0]!.getAttribute("aria-expanded")).toBe("true");
        });

        test("moves the combobox role when the mode flips, leaving no stale state", async () => {
            const mounted = await mountSingle();
            await mounted.focusInput();

            await mounted.setMulti(true);

            // The node that stopped being the combobox must stop announcing too,
            // otherwise a screen reader hears two expandable controls.
            const comboboxes = mounted.queryScope().querySelectorAll("[role='combobox']");
            const announcing = mounted.queryScope().querySelectorAll("[aria-expanded]");
            expect(comboboxes).toHaveLength(1);
            expect(announcing).toHaveLength(1);
            expect(announcing[0]).toBe(comboboxes[0]);
        });

        test("announces multi-selectability on the listbox in multi mode", async () => {
            const mounted = await mountMulti();
            await mounted.focusInput();

            const listbox = mounted.queryScope().querySelector("[data-select-popover]");

            expect(listbox!.getAttribute("aria-multiselectable")).toBe("true");
        });

        test("exactly one node claims the combobox role in multi mode", async () => {
            const mounted = await mountMulti();

            const comboboxes = mounted.queryScope().querySelectorAll("[role='combobox']");

            expect(comboboxes).toHaveLength(1);
        });

        test("renders the groups an addon's transformGroups produced", async () => {
            const mounted = await mountWithAddon({
                name: "pin",
                transformGroups: (groups) => [
                    { key: "pinned", label: "Pinned", options: [PARITY_FRUITS[2]!] },
                    ...groups,
                ],
            });

            await mounted.focusInput();

            expect(groupLabels(mounted)).toContain("Pinned");
            expect(optionLabels(mounted)[0]).toBe("Grape");
        });

        test("publishes what an addon's extendSnapshot returned", async () => {
            const mounted = await mountWithAddon({
                name: "badge",
                extendSnapshot: () => ({ marker: "from-addon" }),
            });

            const published = mounted.publicController()!.getState().addons;

            expect(published["badge"]).toEqual({ marker: "from-addon" });
        });

        test("an addon that removes every group leaves the list empty", async () => {
            const mounted = await mountWithAddon({
                name: "blackhole",
                transformGroups: () => [],
            });

            await mounted.focusInput();

            expect(optionLabels(mounted)).toEqual([]);
            expect(mounted.queryScope().querySelector("[data-select-empty]")).not.toBeNull();
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

        describe("addon-driven controls", () => {
            /**
             * A clear-button addon, structurally. Every wrapper reads the same
             * slice, so the assertion is that all five light up the control the
             * addon asked for — in single mode, where none ships one.
             */
            const clearButtonAddon = {
                name: "clear-button",
                extendSnapshot: () => ({
                    visible: true,
                    label: "⨯",
                    ariaLabel: "Limpar tudo",
                }),
            };

            async function mountWithAddons(options: {
                readonly multiple: boolean;
                readonly addons: ReadonlyArray<ParityAddon>;
            }): Promise<ParityHandle> {
                handle = await adapter.mount({
                    options: PARITY_FRUITS,
                    placeholder: PARITY_PLACEHOLDER,
                    multiple: options.multiple,
                    surface: "popover",
                    addons: options.addons,
                });
                return handle;
            }

            test("single mode offers no clear control on its own", async () => {
                const mounted = await mountSingle();
                await mounted.setValue("apple");

                expect(clearControl(mounted)).toBeNull();
            });

            test("the addon brings the clear control to single mode", async () => {
                const mounted = await mountWithAddons({
                    multiple: false,
                    addons: [clearButtonAddon],
                });
                await mounted.setValue("apple");

                expect(clearControl(mounted)).not.toBeNull();
            });

            test("the control carries the glyph and name the addon published", async () => {
                const mounted = await mountWithAddons({
                    multiple: false,
                    addons: [clearButtonAddon],
                });
                await mounted.setValue("apple");

                const control = clearControl(mounted)!;
                expect((control.textContent ?? "").trim()).toBe("⨯");
                expect(control.getAttribute("aria-label")).toBe("Limpar tudo");
            });

            test("the control the addon added still clears", async () => {
                const mounted = await mountWithAddons({
                    multiple: false,
                    addons: [clearButtonAddon],
                });
                await mounted.setValue("apple");

                await mounted.clickElement(clearControl(mounted)!);

                expect(
                    mounted.queryScope().querySelector("[data-select-selected]"),
                ).toBeNull();
            });

            test("the addon can take the control away in multi mode", async () => {
                const mounted = await mountWithAddons({
                    multiple: true,
                    addons: [
                        {
                            name: "clear-button",
                            extendSnapshot: () => ({
                                visible: false,
                                label: "×",
                                ariaLabel: "x",
                            }),
                        },
                    ],
                });
                await mounted.setValue(["apple"]);

                expect(clearControl(mounted)).toBeNull();
            });

            test("a remove-button addon renames the chip's remove control", async () => {
                const mounted = await mountWithAddons({
                    multiple: true,
                    addons: [
                        {
                            name: "remove-button",
                            extendSnapshot: () => ({
                                enabled: true,
                                label: "×",
                                removable: [
                                    {
                                        value: "apple",
                                        label: "Apple",
                                        ariaLabel: "Remover Apple",
                                    },
                                ],
                            }),
                        },
                    ],
                });
                await mounted.setValue(["apple"]);

                expect(
                    mounted
                        .queryScope()
                        .querySelector("[data-select-chip-remove]")
                        ?.getAttribute("aria-label"),
                ).toBe("Remover Apple");
            });
        });

        describe("inline surface", () => {
            test("renders one chip per option, with no popover and no trigger input", async () => {
                const mounted = await mountInline({ multiple: false });

                expect(inlineChips(mounted)).toHaveLength(PARITY_FRUITS.length);
                expect(isOpen(mounted)).toBe(false);
                expect(
                    isOffered(mounted.queryScope().querySelector("[data-select-input]")),
                ).toBe(false);
            });

            test("keeps the surface as a child of the root, never the root itself", async () => {
                await mountInline({ multiple: false });

                const root = document.querySelector("[data-select-root]")!;
                expect(root.hasAttribute("data-select-surface")).toBe(false);
                expect(root.querySelector("[data-select-surface='inline']")).not.toBeNull();
            });

            test("marks itself as the inline surface", async () => {
                const mounted = await mountInline({ multiple: false });

                expect(
                    mounted.queryScope().querySelector("[data-select-surface='inline']"),
                ).not.toBeNull();
            });

            test("hands its root over through its own public API", async () => {
                const mounted = await mountInline({ multiple: false });

                expect(mounted.publicRoot()).toBe(document.querySelector("[data-select-root]"));
            });

            test("clicking a chip selects it", async () => {
                const mounted = await mountInline({ multiple: false });

                await mounted.clickElement(inlineChips(mounted)[0]!);

                expect(selectedChipLabels(mounted)).toEqual(["Apple"]);
            });

            test("single mode keeps one chip selected at a time", async () => {
                const mounted = await mountInline({ multiple: false });
                await mounted.clickElement(inlineChips(mounted)[0]!);

                await mounted.clickElement(inlineChips(mounted)[2]!);

                expect(selectedChipLabels(mounted)).toEqual(["Grape"]);
            });

            test("multi mode accumulates selected chips", async () => {
                const mounted = await mountInline({ multiple: true });
                await mounted.clickElement(inlineChips(mounted)[0]!);

                await mounted.clickElement(inlineChips(mounted)[2]!);

                expect(selectedChipLabels(mounted)).toEqual(["Apple", "Grape"]);
            });

            test("multi mode deselects a chip clicked twice", async () => {
                const mounted = await mountInline({ multiple: true });
                await mounted.clickElement(inlineChips(mounted)[0]!);

                await mounted.clickElement(inlineChips(mounted)[0]!);

                expect(selectedChipLabels(mounted)).toEqual([]);
            });

            test("renders a header per group when options carry group keys", async () => {
                const mounted = await mountInline({ multiple: false, grouped: true });

                expect(
                    [...mounted.queryScope().querySelectorAll("[data-select-group-label]")].map(
                        (label) => (label.textContent ?? "").trim(),
                    ),
                ).toEqual(["Pomes", "Berries"]);
            });

            test("gives each group its own chip row, so headers own a line", async () => {
                const mounted = await mountInline({ multiple: false, grouped: true });

                const rows = [
                    ...mounted
                        .queryScope()
                        .querySelectorAll("[data-select-surface='inline'] [data-select-tags]"),
                ];

                expect(rows).toHaveLength(2);
                expect(
                    rows.map((row) => row.querySelectorAll("[data-select-chip]").length),
                ).toEqual([2, 1]);
            });

            test("keeps the ungrouped list in a single chip row", async () => {
                const mounted = await mountInline({ multiple: false });

                const rows = mounted
                    .queryScope()
                    .querySelectorAll("[data-select-surface='inline'] [data-select-tags]");

                expect(rows).toHaveLength(1);
                expect(rows[0]!.querySelectorAll("[data-select-chip]")).toHaveLength(
                    PARITY_FRUITS.length,
                );
            });
        });
    });
}
