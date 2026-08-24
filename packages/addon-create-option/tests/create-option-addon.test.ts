import { SingleSelectBoxController, MultiSelectBoxController } from "@select-box/core";
import type { SelectOption } from "@select-box/core";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { CreateOptionAddon } from "../src/create-option-addon.js";

const fruits: ReadonlyArray<SelectOption> = [
    { value: "apple", label: "Apple" },
    { value: "pear", label: "Pear" },
];

/**
 * Stands in for the consumer that owns the option list: it appends the created
 * option and pushes the new list back, which is the contract the addon expects
 * in place of holding the controller itself.
 */
function optionOwner(controller: { setOptions: (o: ReadonlyArray<SelectOption>) => void }) {
    let options = [...fruits];
    return {
        create: (query: string): SelectOption => {
            const option = { value: query.toLowerCase(), label: query };
            options = [...options, option];
            controller.setOptions(options);
            return option;
        },
        get options(): ReadonlyArray<SelectOption> {
            return options;
        },
    };
}

function rowsOf(controller: SingleSelectBoxController): ReadonlyArray<string> {
    return controller
        .getState()
        .filteredGroups.flatMap((group) => group.options.map((option) => option.label));
}

describe("CreateOptionAddon offering the row", () => {
    let controller: SingleSelectBoxController;

    beforeEach(() => {
        controller = new SingleSelectBoxController({ options: fruits });
        controller.use(new CreateOptionAddon({ onCreate: () => null }));
    });

    test("offers nothing while the query is empty", () => {
        expect(rowsOf(controller)).toEqual(["Apple", "Pear"]);
    });

    test("offers nothing while the query still matches something", () => {
        controller.open();
        controller.setQuery("ap");

        expect(rowsOf(controller)).toEqual(["Apple"]);
    });

    test("offers the row once the query matches nothing", () => {
        controller.open();
        controller.setQuery("fig");

        expect(rowsOf(controller)).toEqual(['Add "fig"']);
    });

    test("refuses a query that is only whitespace", () => {
        controller.open();
        controller.setQuery("   ");

        // Whitespace filters nothing out, so the real options stay; what must
        // not appear is a row offering to create the blank.
        expect(rowsOf(controller)).toEqual(["Apple", "Pear"]);
        expect(controller.getState().addons["create-option"].pendingQuery).toBeNull();
    });

    test("trims the query it offers to create", () => {
        controller.open();
        controller.setQuery("  fig  ");

        expect(rowsOf(controller)).toEqual(['Add "fig"']);
    });

    test("publishes what the row would create", () => {
        controller.open();
        controller.setQuery("fig");

        const slice = controller.getState().addons["create-option"];
        expect(slice.pendingQuery).toBe("fig");
        expect(slice.rowValue).toBe("__create__:fig");
    });

    test("publishes nothing while no row is offered", () => {
        expect(controller.getState().addons["create-option"]).toEqual({
            pendingQuery: null,
            rowValue: null,
        });
    });

    test("the row is navigable like any other", () => {
        controller.open();
        controller.setQuery("fig");

        expect(controller.getState().activeOption?.label).toBe('Add "fig"');
    });
});

describe("CreateOptionAddon configuration", () => {
    test("takes a localized label builder", () => {
        const controller = new SingleSelectBoxController({
            options: fruits,
            addons: [
                new CreateOptionAddon({
                    onCreate: () => null,
                    label: (query) => `Criar “${query}”`,
                }),
            ],
        });
        controller.open();
        controller.setQuery("figo");

        expect(rowsOf(controller)).toEqual(["Criar “figo”"]);
    });

    test("offers the row beside the matches when asked to always offer", () => {
        const controller = new SingleSelectBoxController({
            options: fruits,
            addons: [new CreateOptionAddon({ onCreate: () => null, when: "always" })],
        });
        controller.open();
        controller.setQuery("ap");

        expect(rowsOf(controller)).toEqual(["Apple", 'Add "ap"']);
    });

    test("keeps untrimmed text when trimming is off", () => {
        const controller = new SingleSelectBoxController({
            options: fruits,
            addons: [new CreateOptionAddon({ onCreate: () => null, trim: false })],
        });
        controller.open();
        controller.setQuery(" fig");

        expect(controller.getState().addons["create-option"].pendingQuery).toBe(" fig");
    });

    test("puts the row under a header when given one", () => {
        const controller = new SingleSelectBoxController({
            options: fruits,
            addons: [
                new CreateOptionAddon({ onCreate: () => null, groupLabel: "New" }),
            ],
        });
        controller.open();
        controller.setQuery("fig");

        expect(
            controller.getState().filteredGroups.at(-1)?.label,
        ).toBe("New");
    });
});

describe("CreateOptionAddon committing the row", () => {
    test("hands the typed text to the owner and commits what it returns", () => {
        const controller = new SingleSelectBoxController({ options: fruits });
        const owner = optionOwner(controller);
        controller.use(new CreateOptionAddon({ onCreate: owner.create }));
        controller.open();
        controller.setQuery("Fig");

        controller.commitActive();

        expect(controller.getState().value).toBe("fig");
        expect(controller.getState().selectedOption?.label).toBe("Fig");
    });

    test("the created option is resolvable, so the trigger can show it", () => {
        const controller = new SingleSelectBoxController({ options: fruits });
        const owner = optionOwner(controller);
        controller.use(new CreateOptionAddon({ onCreate: owner.create }));
        controller.open();
        controller.setQuery("Fig");
        controller.commitActive();

        expect(owner.options.map((option) => option.value)).toEqual([
            "apple",
            "pear",
            "fig",
        ]);
        expect(controller.getState().selectedOptions).toHaveLength(1);
    });

    test("a refusal from the owner commits nothing", () => {
        const controller = new SingleSelectBoxController({
            options: fruits,
            addons: [new CreateOptionAddon({ onCreate: () => null })],
        });
        controller.open();
        controller.setQuery("fig");

        controller.commitActive();

        expect(controller.getState().value).toBeNull();
    });

    test("leaves a real option alone", () => {
        const onCreate = vi.fn(() => null);
        const controller = new SingleSelectBoxController({
            options: fruits,
            addons: [new CreateOptionAddon({ onCreate })],
        });
        controller.open();

        controller.commitOption(fruits[0]!);

        expect(onCreate).not.toHaveBeenCalled();
        expect(controller.getState().value).toBe("apple");
    });

    test("accumulates created options in multi mode", () => {
        const controller = new MultiSelectBoxController({ options: fruits });
        let options = [...fruits];
        controller.use(
            new CreateOptionAddon({
                onCreate: (query) => {
                    const option = { value: query.toLowerCase(), label: query };
                    options = [...options, option];
                    controller.setOptions(options);
                    return option;
                },
            }),
        );
        controller.open();

        controller.setQuery("Fig");
        controller.commitActive();
        controller.setQuery("Date");
        controller.commitActive();

        expect(controller.getState().value).toEqual(["fig", "date"]);
    });

    test("the synthetic value round-trips through the helpers", () => {
        expect(CreateOptionAddon.queryOf(CreateOptionAddon.syntheticValue("fig"))).toBe("fig");
        expect(CreateOptionAddon.queryOf("apple")).toBeNull();
    });

    test("a query that looks like the synthetic prefix is still just text", () => {
        const controller = new SingleSelectBoxController({
            options: [{ value: "__create__:x", label: "Literal" }],
            addons: [new CreateOptionAddon({ onCreate: () => null })],
        });

        controller.commitOption({ value: "__create__:x", label: "Literal" });

        // The row's value is what marks it synthetic, so a real option carrying
        // that shape is indistinguishable — documented by this test rather than
        // guessed at.
        expect(controller.getState().value).toBeNull();
    });
});
