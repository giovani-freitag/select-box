import { SingleSelectBoxController } from "@select-box/core";
import { describe, expect, test } from "vitest";

import { PersistAddon, restoreSelection } from "../src/index.js";
import type { KeyValueStorage } from "../src/index.js";

/**
 * What the addon writes while the option list is still on its way.
 *
 * A box whose options have not arrived publishes an empty selection because it
 * cannot answer for one. Writing that would erase what the last visit stored,
 * and the user would come back to an empty box with no way to know why.
 */

const FRUITS = [
    { value: "pear", label: "Pear" },
    { value: "apple", label: "Apple" },
];

function storageWith(entries: ReadonlyArray<[string, string]>): {
    readonly store: Map<string, string>;
    readonly storage: KeyValueStorage;
} {
    const store = new Map(entries);
    return {
        store,
        storage: {
            getItem: (key) => store.get(key) ?? null,
            setItem: (key, value) => store.set(key, value),
            removeItem: (key) => store.delete(key),
        },
    };
}

describe("persisting across a late option list", () => {
    test("keeps the stored selection while the list is empty", () => {
        const { store, storage } = storageWith([["fruit", JSON.stringify("pear")]]);

        new SingleSelectBoxController({
            options: [],
            defaultValue: restoreSelection({ key: "fruit", storage }),
            addons: [new PersistAddon({ key: "fruit", storage })],
        });

        expect(store.get("fruit")).toBe(JSON.stringify("pear"));
    });

    test("restores it once the options arrive", () => {
        const { store, storage } = storageWith([["fruit", JSON.stringify("pear")]]);
        const controller = new SingleSelectBoxController({
            options: [],
            defaultValue: restoreSelection({ key: "fruit", storage }),
            addons: [new PersistAddon({ key: "fruit", storage })],
        });

        controller.setOptions(FRUITS);

        expect(controller.getState().value).toBe("pear");
        expect(store.get("fruit")).toBe(JSON.stringify("pear"));
    });

    test("still erases what the user cleared", () => {
        const { store, storage } = storageWith([["fruit", JSON.stringify("pear")]]);
        const controller = new SingleSelectBoxController({
            options: FRUITS,
            defaultValue: "pear",
            addons: [new PersistAddon({ key: "fruit", storage })],
        });

        controller.clear();

        // An emptied selection is removed rather than stored as an empty one.
        expect(store.has("fruit")).toBe(false);
    });
});
