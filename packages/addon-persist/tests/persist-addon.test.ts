import { MultiSelectBoxController, SingleSelectBoxController } from "@select-box/core";
import type { SelectOption } from "@select-box/core";
import { beforeEach, describe, expect, test } from "vitest";

import { PersistAddon, restoreSelection } from "../src/persist-addon.js";
import { SelectionStorageService, type KeyValueStorage } from "../src/selection-storage-service.js";

const fruits: ReadonlyArray<SelectOption> = [
    { value: "apple", label: "Apple" },
    { value: "pear", label: "Pear" },
];

/** In-memory storage, so the tests never depend on a real browser's. */
class MemoryStorage implements KeyValueStorage {
    readonly entries = new Map<string, string>();
    writes = 0;

    getItem(key: string): string | null {
        return this.entries.get(key) ?? null;
    }

    setItem(key: string, value: string): void {
        this.writes += 1;
        this.entries.set(key, value);
    }

    removeItem(key: string): void {
        this.entries.delete(key);
    }
}

/** Storage that refuses everything, like a private window or a full quota. */
class HostileStorage implements KeyValueStorage {
    getItem(): never {
        throw new Error("blocked");
    }

    setItem(): never {
        throw new Error("quota");
    }

    removeItem(): never {
        throw new Error("blocked");
    }
}

describe("PersistAddon saving", () => {
    let storage: MemoryStorage;

    beforeEach(() => {
        storage = new MemoryStorage();
    });

    test("writes the selection as it is made", () => {
        const controller = new SingleSelectBoxController({
            options: fruits,
            addons: [new PersistAddon({ key: "fruit", storage })],
        });

        controller.commitValue("pear");

        expect(storage.getItem("fruit")).toBe('"pear"');
    });

    test("writes every selection in multi mode", () => {
        const controller = new MultiSelectBoxController({
            options: fruits,
            addons: [new PersistAddon({ key: "fruit", storage })],
        });

        controller.commitValue(["pear", "apple"]);

        expect(storage.getItem("fruit")).toBe('["pear","apple"]');
    });

    test("forgets the key once the selection is emptied", () => {
        const controller = new SingleSelectBoxController({
            options: fruits,
            initialValue: "apple",
            addons: [new PersistAddon({ key: "fruit", storage })],
        });
        controller.commitValue("pear");

        controller.clear();

        expect(storage.getItem("fruit")).toBeNull();
    });

    test("does not write again for a publish that left the selection alone", () => {
        const controller = new SingleSelectBoxController({
            options: fruits,
            addons: [new PersistAddon({ key: "fruit", storage })],
        });
        controller.commitValue("pear");
        const afterCommit = storage.writes;

        controller.open();
        controller.setQuery("ap");
        controller.moveActive(1);

        expect(storage.writes).toBe(afterCommit);
    });

    test("publishes the key it is storing under", () => {
        const controller = new SingleSelectBoxController({
            options: fruits,
            initialValue: "apple",
            addons: [new PersistAddon({ key: "fruit", storage })],
        });

        expect(controller.getState().addons.persist.key).toBe("fruit");
        expect(controller.getState().addons.persist.stored).toBe(true);
    });

    test("reports nothing stored while the selection is empty", () => {
        const controller = new SingleSelectBoxController({
            options: fruits,
            addons: [new PersistAddon({ key: "fruit", storage })],
        });

        expect(controller.getState().addons.persist.stored).toBe(false);
    });

    test("survives a storage that refuses every operation", () => {
        const controller = new SingleSelectBoxController({
            options: fruits,
            addons: [new PersistAddon({ key: "fruit", storage: new HostileStorage() })],
        });

        expect(() => controller.commitValue("pear")).not.toThrow();
        expect(controller.getState().value).toBe("pear");
        expect(controller.getState().addons.persist.stored).toBe(false);
    });

    test("writes again after a teardown and a fresh registration", () => {
        const controller = new SingleSelectBoxController({
            options: fruits,
            addons: [new PersistAddon({ key: "fruit", storage })],
        });
        controller.commitValue("pear");
        controller.destroy();
        storage.removeItem("fruit");

        const revived = new SingleSelectBoxController({
            options: fruits,
            initialValue: "pear",
            addons: [new PersistAddon({ key: "fruit", storage })],
        });
        revived.commitValue("apple");

        expect(storage.getItem("fruit")).toBe('"apple"');
    });
});

describe("restoreSelection", () => {
    test("hands back what was stored, ready to be an initial value", () => {
        const storage = new MemoryStorage();
        storage.setItem("fruit", '"pear"');

        const controller = new SingleSelectBoxController({
            options: fruits,
            initialValue: restoreSelection({ key: "fruit", storage }),
            addons: [new PersistAddon({ key: "fruit", storage })],
        });

        expect(controller.getState().value).toBe("pear");
    });

    test("restores a multi selection", () => {
        const storage = new MemoryStorage();
        storage.setItem("fruit", '["apple","pear"]');

        expect(restoreSelection({ key: "fruit", storage, mode: "multi" })).toEqual([
            "apple",
            "pear",
        ]);
    });

    test("hands back null when nothing was stored", () => {
        expect(restoreSelection({ key: "fruit", storage: new MemoryStorage() })).toBeNull();
    });

    test("hands back an empty list when nothing was stored for multi", () => {
        expect(
            restoreSelection({ key: "fruit", storage: new MemoryStorage(), mode: "multi" }),
        ).toEqual([]);
    });

    test("keeps the first entry when a list is restored into single mode", () => {
        const storage = new MemoryStorage();
        storage.setItem("fruit", '["pear","apple"]');

        expect(restoreSelection({ key: "fruit", storage })).toBe("pear");
    });

    test("wraps a lone value restored into multi mode", () => {
        const storage = new MemoryStorage();
        storage.setItem("fruit", '"pear"');

        expect(restoreSelection({ key: "fruit", storage, mode: "multi" })).toEqual(["pear"]);
    });

    test("an emptied list restored into single mode is no selection", () => {
        const storage = new MemoryStorage();
        storage.setItem("fruit", "[]");

        expect(restoreSelection({ key: "fruit", storage })).toBeNull();
    });

    test("refuses stored junk rather than handing back a broken value", () => {
        const storage = new MemoryStorage();
        storage.setItem("fruit", "{not json");

        expect(restoreSelection({ key: "fruit", storage })).toBeNull();
    });

    test("refuses a stored shape that is not a selection", () => {
        const storage = new MemoryStorage();
        storage.setItem("fruit", '{"value":"pear"}');

        expect(restoreSelection({ key: "fruit", storage })).toBeNull();
    });

    test("refuses an array that is not all strings", () => {
        const storage = new MemoryStorage();
        storage.setItem("fruit", '["apple",7]');

        expect(restoreSelection({ key: "fruit", storage })).toBeNull();
    });

    test("a restored value that no longer exists is pruned by the controller", () => {
        const storage = new MemoryStorage();
        storage.setItem("fruit", '"fig"');

        const controller = new SingleSelectBoxController({
            options: fruits,
            initialValue: restoreSelection({ key: "fruit", storage }),
        });

        expect(controller.getState().value).toBeNull();
    });
});

describe("SelectionStorageService", () => {
    test("falls back to no storage when the area is unavailable", () => {
        const service = new SelectionStorageService({ key: "fruit", area: "session" });

        // No `sessionStorage` in this environment; the service has to degrade
        // rather than throw at construction.
        expect(() => service.write("pear")).not.toThrow();
        expect(service.read()).toBeNull();
    });

    test("forget clears the key", () => {
        const storage = new MemoryStorage();
        const service = new SelectionStorageService({ key: "fruit", storage });
        service.write("pear");

        service.forget();

        expect(service.read()).toBeNull();
    });
});
