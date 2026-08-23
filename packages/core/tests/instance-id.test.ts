import { describe, expect, test } from "vitest";

import { nextSelectBoxId, optionElementId } from "../src/instance-id.js";

describe("instance ids", () => {
    test("hands out a different prefix every time", () => {
        const first = nextSelectBoxId();
        const second = nextSelectBoxId();

        expect(first).not.toBe(second);
    });

    test("builds a row id from a prefix and an option value", () => {
        expect(optionElementId("select-box-7", "pear")).toBe("select-box-7-opt-pear");
    });

    test("percent-encodes a value that would otherwise break the id", () => {
        expect(optionElementId("select-box-1", "two words")).toBe("select-box-1-opt-two%20words");
    });

    test("row ids are unique across instances and options", () => {
        const one = nextSelectBoxId();
        const two = nextSelectBoxId();

        const ids = [
            optionElementId(one, "apple"),
            optionElementId(one, "pear"),
            optionElementId(two, "apple"),
            optionElementId(two, "pear"),
        ];

        expect(new Set(ids).size).toBe(ids.length);
    });
});
