import { describe, expect, test } from "vitest";

import { SingleSelectBoxController } from "../src/controllers/single-select-box-controller.js";
import { AbstractFilterStrategy, SubstringFilterStrategy } from "../src/filters/index.js";
import type { OptionFilterStrategy, SelectBoxAddon, SelectOption } from "../src/types.js";

const fruits: SelectOption[] = [
    { value: "apple", label: "Apple", group: "Pomes" },
    { value: "pear", label: "Pear", group: "Pomes" },
    { value: "lemon", label: "Lemon" },
];

class StartsWithFilterStrategy extends AbstractFilterStrategy {
    override filter(options: ReadonlyArray<SelectOption>, query: string) {
        const needle = query.trim().toLowerCase();
        if (needle === "") return options;
        return options.filter((option) => option.label.toLowerCase().startsWith(needle));
    }
    override match(label: string, query: string) {
        const needle = query.trim().toLowerCase();
        if (needle === "" || !label.toLowerCase().startsWith(needle)) return [];
        return [{ start: 0, end: needle.length }];
    }
}

class StartsWithModeAddon implements SelectBoxAddon {
    readonly name = "starts-with-mode";

    provideFilter(): OptionFilterStrategy {
        return new StartsWithFilterStrategy();
    }
}

describe("controller.setFilter", () => {
    test("swaps the strategy and recomputes filteredGroups", () => {
        const controller = new SingleSelectBoxController({ options: fruits });
        controller.setQuery("ap");

        expect(controller.getState().filteredGroups[0]?.options[0]?.label).toBe("Apple");

        controller.setFilter(new StartsWithFilterStrategy());

        const labels = controller
            .getState()
            .filteredGroups.flatMap((group) => group.options.map((option) => option.label));
        expect(labels).toEqual(["Apple"]);
    });

    test("no-ops when the same strategy is reapplied", () => {
        const strategy = new SubstringFilterStrategy();
        const controller = new SingleSelectBoxController({ options: fruits, filter: strategy });
        let notifications = 0;
        controller.subscribe(() => {
            notifications += 1;
        });

        controller.setFilter(strategy);

        expect(notifications).toBe(0);
    });
});

describe("addon.provideFilter", () => {
    test("addon's filter wins over the default when no explicit filter is set", () => {
        const controller = new SingleSelectBoxController({ options: fruits });
        expect(controller.getFilter()).toBeInstanceOf(SubstringFilterStrategy);

        controller.use(new StartsWithModeAddon());

        expect(controller.getFilter()).toBeInstanceOf(StartsWithFilterStrategy);
    });

    test("addons registered via config are honored before the first snapshot", () => {
        const controller = new SingleSelectBoxController({
            options: fruits,
            addons: [new StartsWithModeAddon()],
        });

        expect(controller.getFilter()).toBeInstanceOf(StartsWithFilterStrategy);
    });

    test("explicit config.filter overrides addon providers", () => {
        const explicit = new SubstringFilterStrategy();
        const controller = new SingleSelectBoxController({
            options: fruits,
            filter: explicit,
            addons: [new StartsWithModeAddon()],
        });

        expect(controller.getFilter()).toBe(explicit);
    });

    test("controller.setFilter overrides a provider that was already in play", () => {
        const controller = new SingleSelectBoxController({
            options: fruits,
            addons: [new StartsWithModeAddon()],
        });
        const explicit = new SubstringFilterStrategy();

        controller.setFilter(explicit);

        expect(controller.getFilter()).toBe(explicit);
    });

    test("last addon to provide a filter wins when multiple addons provide", () => {
        const firstStrategy = new StartsWithFilterStrategy();
        const secondStrategy = new SubstringFilterStrategy();
        const firstAddon: SelectBoxAddon = {
            name: "first",
            provideFilter: () => firstStrategy,
        };
        const secondAddon: SelectBoxAddon = {
            name: "second",
            provideFilter: () => secondStrategy,
        };

        const controller = new SingleSelectBoxController({
            options: fruits,
            addons: [firstAddon, secondAddon],
        });

        expect(controller.getFilter()).toBe(secondStrategy);
    });
});

describe("addon lifecycle", () => {
    test("attach and detach are called on registration and destroy", () => {
        const probe: string[] = [];
        const addon: SelectBoxAddon = {
            name: "lifecycle",
            attach: () => probe.push("attach"),
            detach: () => probe.push("detach"),
        };

        const controller = new SingleSelectBoxController({ options: fruits });
        controller.use(addon);
        controller.destroy();

        expect(probe).toEqual(["attach", "detach"]);
    });

    test("addons without lifecycle hooks are accepted", () => {
        const controller = new SingleSelectBoxController({ options: fruits });

        expect(() => controller.use({ name: "no-hooks" })).not.toThrow();
    });
});
