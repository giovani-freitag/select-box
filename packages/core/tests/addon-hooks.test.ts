import { describe, expect, test, vi } from "vitest";

import { MultiSelectBoxController } from "../src/controllers/multi-select-box-controller.js";
import { SelectBoxKeyDispatcher } from "../src/controllers/key-dispatcher.js";
import { SingleSelectBoxController } from "../src/controllers/single-select-box-controller.js";
import type {
    AddonTransformContext,
    SelectBoxAddon,
    SelectGroup,
    SelectOption,
} from "../src/types.js";

const fruits: ReadonlyArray<SelectOption> = [
    { value: "apple", label: "Apple", group: "Pomes" },
    { value: "pear", label: "Pear", group: "Pomes" },
    { value: "lemon", label: "Lemon", group: "Citrus" },
];

function labelsOf(groups: ReadonlyArray<SelectGroup>): ReadonlyArray<string> {
    return groups.flatMap((group) => group.options.map((option) => option.label));
}

describe("transformOptions", () => {
    test("reorders inside a group without touching the group list", () => {
        const addon: SelectBoxAddon = {
            name: "reverse",
            transformOptions: (options) => [...options].reverse(),
        };
        const controller = new SingleSelectBoxController({ options: fruits, addons: [addon] });

        const groups = controller.getState().filteredGroups;

        expect(groups.map((group) => group.key)).toEqual(["Pomes", "Citrus"]);
        expect(labelsOf(groups)).toEqual(["Pear", "Apple", "Lemon"]);
    });

    test("receives the group it is transforming", () => {
        const seen: string[] = [];
        const controller = new SingleSelectBoxController({
            options: fruits,
            addons: [
                {
                    name: "probe",
                    transformOptions: (options, group) => {
                        seen.push(group.key);
                        return options;
                    },
                },
            ],
        });

        controller.getState();

        expect(seen).toEqual(["Pomes", "Citrus"]);
    });

    test("can inject an option that was never in the list", () => {
        const controller = new SingleSelectBoxController({
            options: fruits,
            addons: [
                {
                    name: "inject",
                    transformOptions: (options, group) =>
                        group.key === "Citrus"
                            ? [...options, { value: "lime", label: "Lime" }]
                            : options,
                },
            ],
        });

        expect(labelsOf(controller.getState().filteredGroups)).toEqual([
            "Apple",
            "Pear",
            "Lemon",
            "Lime",
        ]);
    });

    test("an injected option is navigable and committable", () => {
        const controller = new SingleSelectBoxController({
            options: [{ value: "apple", label: "Apple" }],
            addons: [
                {
                    name: "inject",
                    transformOptions: (options) => [
                        ...options,
                        { value: "lime", label: "Lime" },
                    ],
                },
            ],
        });
        controller.open();

        controller.moveActive(1);

        expect(controller.getState().activeOption?.value).toBe("lime");
        controller.commitActive();
        expect(controller.getState().value).toBe("lime");
    });

    test("runs after transformGroups, so an injected group is offered too", () => {
        const controller = new SingleSelectBoxController({
            options: fruits,
            addons: [
                {
                    name: "add-group",
                    transformGroups: (groups) => [
                        ...groups,
                        { key: "extra", label: "Extra", options: [] },
                    ],
                },
                {
                    name: "fill-group",
                    transformOptions: (options, group) =>
                        group.key === "extra"
                            ? [{ value: "fig", label: "Fig" }]
                            : options,
                },
            ],
        });

        expect(labelsOf(controller.getState().filteredGroups)).toEqual([
            "Apple",
            "Pear",
            "Lemon",
            "Fig",
        ]);
    });

    test("composes in registration order", () => {
        const order: string[] = [];
        const controller = new SingleSelectBoxController({
            options: fruits,
            addons: [
                {
                    name: "first",
                    transformOptions: (options) => {
                        order.push("first");
                        return options;
                    },
                },
                {
                    name: "second",
                    transformOptions: (options) => {
                        order.push("second");
                        return options;
                    },
                },
            ],
        });

        controller.getState();

        expect(order.slice(0, 2)).toEqual(["first", "second"]);
    });

    test("runs once per interaction, not once per snapshot read", () => {
        let runs = 0;
        const controller = new SingleSelectBoxController({
            options: fruits,
            addons: [
                {
                    name: "counter",
                    transformOptions: (options) => {
                        runs += 1;
                        return options;
                    },
                },
            ],
        });
        controller.getState();
        const afterFirstRead = runs;

        controller.getState();
        controller.getState();

        expect(runs).toBe(afterFirstRead);
    });

    test("hands back the very group it was given when it changed nothing", () => {
        const upstream: Array<ReadonlyArray<SelectGroup>> = [];
        const controller = new SingleSelectBoxController({
            options: fruits,
            addons: [
                {
                    name: "capture",
                    transformGroups: (groups) => {
                        upstream.push(groups);
                        return groups;
                    },
                },
                { name: "noop", transformOptions: (options) => options },
            ],
        });

        const groups = controller.getState().filteredGroups;

        // A no-op transform must not spend a fresh object per group: the row
        // model rebuilds on group identity, so churn here repaints for nothing.
        expect(groups[0]).toBe(upstream[0]?.[0]);
        expect(groups[1]).toBe(upstream[0]?.[1]);
    });
});

describe("interceptCommit", () => {
    test("vetoes a commit by returning null", () => {
        const controller = new SingleSelectBoxController({
            options: fruits,
            addons: [{ name: "veto", interceptCommit: () => null }],
        });

        controller.commitOption(fruits[0]!);

        expect(controller.getState().value).toBeNull();
    });

    test("replaces the committed option", () => {
        const controller = new SingleSelectBoxController({
            options: fruits,
            addons: [
                {
                    name: "swap",
                    interceptCommit: () => fruits[2]!,
                },
            ],
        });

        controller.commitOption(fruits[0]!);

        expect(controller.getState().value).toBe("lemon");
    });

    test("each addon sees the previous replacement", () => {
        const seen: string[] = [];
        const controller = new SingleSelectBoxController({
            options: fruits,
            addons: [
                {
                    name: "first",
                    interceptCommit: (option) => {
                        seen.push(option.value);
                        return fruits[1]!;
                    },
                },
                {
                    name: "second",
                    interceptCommit: (option) => {
                        seen.push(option.value);
                        return option;
                    },
                },
            ],
        });

        controller.commitOption(fruits[0]!);

        expect(seen).toEqual(["apple", "pear"]);
        expect(controller.getState().value).toBe("pear");
    });

    test("the first veto stops the chain", () => {
        const later = vi.fn();
        const controller = new SingleSelectBoxController({
            options: fruits,
            addons: [
                { name: "veto", interceptCommit: () => null },
                {
                    name: "later",
                    interceptCommit: (option) => {
                        later();
                        return option;
                    },
                },
            ],
        });

        controller.commitOption(fruits[0]!);

        expect(later).not.toHaveBeenCalled();
    });

    test("carries the state the commit is being judged against", () => {
        const captured: { context: AddonTransformContext | null } = { context: null };
        const controller = new MultiSelectBoxController({
            options: fruits,
            initialValue: ["lemon"],
            addons: [
                {
                    name: "probe",
                    interceptCommit: (option, context) => {
                        captured.context = context;
                        return option;
                    },
                },
            ],
        });
        controller.open();

        controller.commitOption(fruits[0]!);

        expect(captured.context?.selectedOptions.map((option) => option.value)).toEqual(["lemon"]);
        expect(captured.context?.open).toBe(true);
    });

    test("runs for a keyboard commit too", () => {
        const controller = new SingleSelectBoxController({
            options: fruits,
            addons: [{ name: "veto", interceptCommit: () => null }],
        });
        controller.open();
        controller.moveActive(1);

        controller.commitActive();

        expect(controller.getState().value).toBeNull();
    });

    test("does not run for a value set programmatically", () => {
        const intercept = vi.fn(() => null);
        const controller = new SingleSelectBoxController({
            options: fruits,
            addons: [{ name: "veto", interceptCommit: intercept }],
        });

        controller.commitValue("apple");

        expect(intercept).not.toHaveBeenCalled();
        expect(controller.getState().value).toBe("apple");
    });

    test("a replacement that is disabled is refused", () => {
        const controller = new SingleSelectBoxController({
            options: fruits,
            addons: [
                {
                    name: "swap",
                    interceptCommit: () => ({ value: "fig", label: "Fig", disabled: true }),
                },
            ],
        });

        controller.commitOption(fruits[0]!);

        expect(controller.getState().value).toBeNull();
    });
});

describe("interceptOpen and interceptClose", () => {
    test("a synchronous refusal keeps the popover closed", () => {
        const controller = new SingleSelectBoxController({
            options: fruits,
            addons: [{ name: "gate", interceptOpen: () => false }],
        });

        controller.open();

        expect(controller.getState().open).toBe(false);
        expect(controller.getState().pending).toBe(false);
    });

    test("a synchronous approval opens without ever going pending", () => {
        const seen: boolean[] = [];
        const controller = new SingleSelectBoxController({
            options: fruits,
            addons: [{ name: "gate", interceptOpen: () => true }],
        });
        controller.subscribe(() => seen.push(controller.getState().pending));

        controller.open();

        expect(controller.getState().open).toBe(true);
        expect(seen).toEqual([false]);
    });

    test("one refusal outweighs the approvals around it", () => {
        const controller = new SingleSelectBoxController({
            options: fruits,
            addons: [
                { name: "yes", interceptOpen: () => true },
                { name: "no", interceptOpen: () => false },
            ],
        });

        controller.open();

        expect(controller.getState().open).toBe(false);
    });

    test("an async gate publishes pending, then opens", async () => {
        const controller = new SingleSelectBoxController({
            options: fruits,
            addons: [{ name: "gate", interceptOpen: () => Promise.resolve(true) }],
        });

        controller.open();
        expect(controller.getState().pending).toBe(true);
        expect(controller.getState().open).toBe(false);

        await Promise.resolve();
        await Promise.resolve();

        expect(controller.getState().pending).toBe(false);
        expect(controller.getState().open).toBe(true);
    });

    test("an async refusal drops pending and stays closed", async () => {
        const controller = new SingleSelectBoxController({
            options: fruits,
            addons: [{ name: "gate", interceptOpen: () => Promise.resolve(false) }],
        });

        controller.open();
        await Promise.resolve();
        await Promise.resolve();

        expect(controller.getState().pending).toBe(false);
        expect(controller.getState().open).toBe(false);
    });

    test("a rejected gate is treated as a refusal rather than escaping", async () => {
        const controller = new SingleSelectBoxController({
            options: fruits,
            addons: [{ name: "gate", interceptOpen: () => Promise.reject(new Error("boom")) }],
        });

        controller.open();
        await Promise.resolve();
        await Promise.resolve();

        expect(controller.getState().pending).toBe(false);
        expect(controller.getState().open).toBe(false);
    });

    test("a stale answer is dropped when another request came after it", async () => {
        const gate: { release: ((value: boolean) => void) | null } = { release: null };
        const controller = new SingleSelectBoxController({
            options: fruits,
            addons: [
                {
                    name: "gate",
                    interceptOpen: () =>
                        new Promise<boolean>((resolve) => {
                            gate.release = resolve;
                        }),
                },
            ],
        });

        controller.open();
        expect(controller.getState().pending).toBe(true);
        // The user gave up and closed before the gate answered.
        controller.close();
        gate.release?.(true);
        await Promise.resolve();
        await Promise.resolve();

        expect(controller.getState().open).toBe(false);
    });

    test("gates the close as well", () => {
        const controller = new SingleSelectBoxController({
            options: fruits,
            addons: [{ name: "gate", interceptClose: () => false }],
        });
        controller.open();

        controller.close();

        expect(controller.getState().open).toBe(true);
    });

    test("the open gate never runs while the box is already open", () => {
        const gate = vi.fn(() => true);
        const controller = new SingleSelectBoxController({
            options: fruits,
            addons: [{ name: "gate", interceptOpen: gate }],
        });

        controller.open();
        controller.open();

        expect(gate).toHaveBeenCalledTimes(1);
    });

    test("a disabled control never reaches the gate", () => {
        const gate = vi.fn(() => true);
        const controller = new SingleSelectBoxController({
            options: fruits,
            disabled: true,
            addons: [{ name: "gate", interceptOpen: gate }],
        });

        controller.open();

        expect(gate).not.toHaveBeenCalled();
    });
});

describe("onKeyDown", () => {
    function dispatcherFor(addon: SelectBoxAddon): {
        readonly controller: SingleSelectBoxController;
        readonly dispatcher: SelectBoxKeyDispatcher<object, string | null>;
    } {
        const controller = new SingleSelectBoxController({ options: fruits, addons: [addon] });
        return { controller, dispatcher: new SelectBoxKeyDispatcher(controller) };
    }

    test("claims a key before the built-in bindings see it", () => {
        const { controller, dispatcher } = dispatcherFor({
            name: "claim",
            onKeyDown: (key) => (key === "ArrowDown" ? "handled" : "pass"),
        });

        const outcome = dispatcher.dispatch("ArrowDown");

        expect(outcome).toBe("handled");
        expect(controller.getState().open).toBe(false);
    });

    test("passing through leaves the built-in binding in charge", () => {
        const { controller, dispatcher } = dispatcherFor({
            name: "pass",
            onKeyDown: () => "pass",
        });

        dispatcher.dispatch("ArrowDown");

        expect(controller.getState().open).toBe(true);
    });

    test("claims a key the combobox has no binding for", () => {
        const { dispatcher } = dispatcherFor({
            name: "claim",
            onKeyDown: (key) => (key === "Backspace" ? "handled" : "pass"),
        });

        expect(dispatcher.dispatch("Backspace")).toBe("handled");
    });

    test("stops at the first addon that claims the key", () => {
        const later = vi.fn((): "pass" => "pass");
        const controller = new SingleSelectBoxController({
            options: fruits,
            addons: [
                { name: "first", onKeyDown: () => "handled" },
                { name: "second", onKeyDown: later },
            ],
        });

        new SelectBoxKeyDispatcher(controller).dispatch("Escape");

        expect(later).not.toHaveBeenCalled();
    });

    test("carries the state the key is being judged against", () => {
        const captured: { context: AddonTransformContext | null } = { context: null };
        const controller = new MultiSelectBoxController({
            options: fruits,
            initialValue: ["apple"],
            addons: [
                {
                    name: "probe",
                    onKeyDown: (_key, context) => {
                        captured.context = context;
                        return "pass";
                    },
                },
            ],
        });

        new SelectBoxKeyDispatcher(controller).dispatch("Backspace");

        expect(captured.context?.mode).toBe("multi");
        expect(captured.context?.selectedOptions.map((option) => option.value)).toEqual(["apple"]);
    });

    test("an unclaimed key with no binding still passes", () => {
        const { dispatcher } = dispatcherFor({ name: "pass", onKeyDown: () => "pass" });

        expect(dispatcher.dispatch("q")).toBe("pass");
    });
});

describe("onKeyDown effects", () => {
    test("commits the option the addon named", () => {
        const controller = new MultiSelectBoxController({
            options: fruits,
            initialValue: ["apple"],
            addons: [
                {
                    name: "pop",
                    onKeyDown: (key, context) =>
                        key === "Backspace" && context.selectedOptions.length > 0
                            ? { commitOption: context.selectedOptions.at(-1)! }
                            : "pass",
                },
            ],
        });

        new SelectBoxKeyDispatcher(controller).dispatch("Backspace");

        expect(controller.getState().value).toEqual([]);
    });

    test("replaces the query the addon named", () => {
        const controller = new SingleSelectBoxController({
            options: fruits,
            addons: [{ name: "seed", onKeyDown: () => ({ query: "lem" }) }],
        });
        controller.open();

        new SelectBoxKeyDispatcher(controller).dispatch("Backspace");

        expect(controller.getState().query).toBe("lem");
    });

    test("applies a commit and a query together, commit first", () => {
        const controller = new MultiSelectBoxController({
            options: fruits,
            initialValue: ["lemon"],
            addons: [
                {
                    name: "restore",
                    onKeyDown: (_key, context) => ({
                        commitOption: context.selectedOptions[0]!,
                        query: context.selectedOptions[0]!.label,
                    }),
                },
            ],
        });
        controller.open();

        new SelectBoxKeyDispatcher(controller).dispatch("Backspace");

        expect(controller.getState().value).toEqual([]);
        expect(controller.getState().query).toBe("Lemon");
    });

    test("a query set alongside a commit survives the commit that closes", () => {
        const controller = new SingleSelectBoxController({
            options: fruits,
            addons: [
                {
                    name: "restore",
                    onKeyDown: () => ({ commitOption: fruits[0]!, query: "keep me" }),
                },
            ],
        });
        controller.open();

        new SelectBoxKeyDispatcher(controller).dispatch("Backspace");

        // Single mode clears the query as part of committing, so the effect's
        // query has to land after it or it is silently thrown away.
        expect(controller.getState().value).toBe("apple");
        expect(controller.getState().query).toBe("keep me");
    });

    test("empties the selection when the effect asks to clear", () => {
        const controller = new SingleSelectBoxController({
            options: fruits,
            initialValue: "apple",
            addons: [{ name: "wipe", onKeyDown: () => ({ clear: true }) }],
        });

        new SelectBoxKeyDispatcher(controller).dispatch("Backspace");

        expect(controller.getState().value).toBeNull();
    });

    test("a query set alongside a clear survives it", () => {
        const controller = new SingleSelectBoxController({
            options: fruits,
            initialValue: "apple",
            addons: [
                { name: "wipe", onKeyDown: () => ({ clear: true, query: "Apple" }) },
            ],
        });
        controller.open();

        new SelectBoxKeyDispatcher(controller).dispatch("Backspace");

        expect(controller.getState().value).toBeNull();
        expect(controller.getState().query).toBe("Apple");
    });

    test("a clear through an effect respects the interaction gate", () => {
        const controller = new SingleSelectBoxController({
            options: fruits,
            initialValue: "apple",
            readOnly: true,
            addons: [{ name: "wipe", onKeyDown: () => ({ clear: true }) }],
        });

        new SelectBoxKeyDispatcher(controller).dispatch("Backspace");

        expect(controller.getState().value).toBe("apple");
    });

    test("opens and closes on request", () => {
        const controller = new SingleSelectBoxController({
            options: fruits,
            addons: [
                {
                    name: "toggler",
                    onKeyDown: (key) =>
                        key === "F2" ? { open: true } : key === "F3" ? { open: false } : "pass",
                },
            ],
        });
        const dispatcher = new SelectBoxKeyDispatcher(controller);

        dispatcher.dispatch("F2");
        expect(controller.getState().open).toBe(true);

        dispatcher.dispatch("F3");
        expect(controller.getState().open).toBe(false);
    });

    test("an effect counts as handled, so the built-in binding stays out", () => {
        const controller = new SingleSelectBoxController({
            options: fruits,
            addons: [{ name: "claim", onKeyDown: () => ({ query: "x" }) }],
        });

        const outcome = new SelectBoxKeyDispatcher(controller).dispatch("ArrowDown");

        expect(outcome).toBe("handled");
        expect(controller.getState().open).toBe(false);
    });

    test("an empty effect claims the key without changing anything", () => {
        const controller = new SingleSelectBoxController({
            options: fruits,
            addons: [{ name: "swallow", onKeyDown: () => ({}) }],
        });

        const outcome = new SelectBoxKeyDispatcher(controller).dispatch("ArrowDown");

        expect(outcome).toBe("handled");
        expect(controller.getState()).toMatchObject({ open: false, query: "" });
    });

    test("a commit through an effect still goes through the commit gate", () => {
        const controller = new MultiSelectBoxController({
            options: fruits,
            initialValue: ["apple"],
            addons: [
                { name: "veto", interceptCommit: () => null },
                {
                    name: "pop",
                    onKeyDown: (_key, context) => ({
                        commitOption: context.selectedOptions[0]!,
                    }),
                },
            ],
        });

        new SelectBoxKeyDispatcher(controller).dispatch("Backspace");

        expect(controller.getState().value).toEqual(["apple"]);
    });
});
