import { describe, expect, test } from "vitest";

import { SingleSelectBoxController } from "../src/controllers/single-select-box-controller.js";
import { AbstractFilterStrategy, SubstringFilterStrategy } from "../src/filters/index.js";
import type { OptionFilterStrategy, SelectBoxAddon, SelectBoxAddonHost, SelectOption } from "../src/types.js";

const fruits = [
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

describe("addon.attach(host)", () => {
    test("addon receives a host that can swap the filter", () => {
        class StartsWithModeAddon implements SelectBoxAddon {
            readonly name = "starts-with-mode";
            private previous: OptionFilterStrategy | null = null;
            private host: SelectBoxAddonHost | null = null;

            attach(host: SelectBoxAddonHost): void {
                this.host = host;
                this.previous = host.getFilter();
                host.setFilter(new StartsWithFilterStrategy());
            }

            detach(): void {
                if (this.host && this.previous) {
                    this.host.setFilter(this.previous);
                }
                this.host = null;
                this.previous = null;
            }
        }

        const controller = new SingleSelectBoxController({ options: fruits });
        expect(controller.getFilter()).toBeInstanceOf(SubstringFilterStrategy);

        controller.use(new StartsWithModeAddon());

        expect(controller.getFilter()).toBeInstanceOf(StartsWithFilterStrategy);
    });

    test("detach restores whatever filter was active when the addon attached", () => {
        const original = new SubstringFilterStrategy();
        class StartsWithModeAddon implements SelectBoxAddon {
            readonly name = "starts-with-mode";
            private previous: OptionFilterStrategy | null = null;
            private host: SelectBoxAddonHost | null = null;
            attach(host: SelectBoxAddonHost): void {
                this.host = host;
                this.previous = host.getFilter();
                host.setFilter(new StartsWithFilterStrategy());
            }
            detach(): void {
                if (this.host && this.previous) this.host.setFilter(this.previous);
                this.host = null;
                this.previous = null;
            }
        }

        const controller = new SingleSelectBoxController({ options: fruits, filter: original });
        controller.use(new StartsWithModeAddon());

        expect(controller.getFilter()).toBeInstanceOf(StartsWithFilterStrategy);

        controller.destroy();

        expect(controller.getFilter()).toBe(original);
    });

    test("addons can chain into more addons via host.use", () => {
        const probe: string[] = [];
        const inner: SelectBoxAddon = {
            name: "inner",
            attach: () => probe.push("inner-attach"),
            detach: () => probe.push("inner-detach"),
        };
        const outer: SelectBoxAddon = {
            name: "outer",
            attach: (host) => {
                probe.push("outer-attach");
                host.use(inner);
            },
            detach: () => probe.push("outer-detach"),
        };

        const controller = new SingleSelectBoxController({ options: fruits });
        controller.use(outer);

        expect(probe).toEqual(["outer-attach", "inner-attach"]);
    });
});
