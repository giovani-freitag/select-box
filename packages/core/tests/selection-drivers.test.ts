import { describe, expect, test } from "vitest";

import { MultiSelectionDriver } from "../src/controllers/multi-selection-driver.js";
import { SingleSelectionDriver } from "../src/controllers/single-selection-driver.js";

const apple = { value: "apple", label: "Apple" };
const pear = { value: "pear", label: "Pear" };
const plum = { value: "plum", label: "Plum", disabled: true };

describe("SingleSelectionDriver", () => {
    test("empty() returns null", () => {
        const driver = new SingleSelectionDriver();

        expect(driver.empty()).toBeNull();
    });

    test("coerce() turns numbers into strings and arrays into the first item", () => {
        const driver = new SingleSelectionDriver();

        expect(driver.coerce(42)).toBe("42");
        expect(driver.coerce("apple")).toBe("apple");
        expect(driver.coerce(null)).toBeNull();
        expect(driver.coerce(undefined)).toBeNull();
        expect(driver.coerce(["pear", "apple"])).toBe("pear");
        expect(driver.coerce([])).toBeNull();
    });

    test("commit() replaces the current value", () => {
        const driver = new SingleSelectionDriver();

        expect(driver.commit(null, apple)).toBe("apple");
        expect(driver.commit("pear", apple)).toBe("apple");
    });

    test("closeOnCommit is true", () => {
        const driver = new SingleSelectionDriver();

        expect(driver.closeOnCommit).toBe(true);
    });

    test("contains() matches the held key", () => {
        const driver = new SingleSelectionDriver();

        expect(driver.contains("apple", "apple")).toBe(true);
        expect(driver.contains("apple", "pear")).toBe(false);
        expect(driver.contains(null, "apple")).toBe(false);
    });

    test("keys() returns the singleton or empty list", () => {
        const driver = new SingleSelectionDriver();

        expect(driver.keys("apple")).toEqual(["apple"]);
        expect(driver.keys(null)).toEqual([]);
    });
});

describe("MultiSelectionDriver", () => {
    test("empty() returns the same frozen empty array", () => {
        const driver = new MultiSelectionDriver();

        expect(driver.empty()).toEqual([]);
        expect(driver.empty()).toBe(driver.empty());
    });

    test("coerce() normalises any input shape into a deduped string array", () => {
        const driver = new MultiSelectionDriver();

        expect(driver.coerce(null)).toEqual([]);
        expect(driver.coerce(undefined)).toEqual([]);
        expect(driver.coerce("apple")).toEqual(["apple"]);
        expect(driver.coerce(7)).toEqual(["7"]);
        expect(driver.coerce(["apple", 1, "apple", 1])).toEqual(["apple", "1"]);
    });

    test("commit() adds a missing option", () => {
        const driver = new MultiSelectionDriver();

        const next = driver.commit(["apple"], pear);

        expect(next).toEqual(["apple", "pear"]);
    });

    test("commit() removes an option already present (toggle)", () => {
        const driver = new MultiSelectionDriver();

        const next = driver.commit(["apple", "pear"], apple);

        expect(next).toEqual(["pear"]);
    });

    test("commit() falls back to the shared empty array when removing the last entry", () => {
        const driver = new MultiSelectionDriver();

        const next = driver.commit(["apple"], apple);

        expect(next).toEqual([]);
        expect(next).toBe(driver.empty());
    });

    test("closeOnCommit is false", () => {
        const driver = new MultiSelectionDriver();

        expect(driver.closeOnCommit).toBe(false);
    });

    test("contains() reflects array membership", () => {
        const driver = new MultiSelectionDriver();

        expect(driver.contains(["apple", "pear"], "pear")).toBe(true);
        expect(driver.contains(["apple"], "pear")).toBe(false);
    });

    test("commit() ignores disabled flag — selection legality is the controller's responsibility", () => {
        const driver = new MultiSelectionDriver();

        const next = driver.commit([], plum);

        expect(next).toEqual(["plum"]);
    });
});
