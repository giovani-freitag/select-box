import { describe, expect, test } from "vitest";

import { resolvePopoverPlacement } from "../src/index.js";

const VIEWPORT = 740;

describe("resolvePopoverPlacement", () => {
    test("opens below when the list fits there", () => {
        const placement = resolvePopoverPlacement({
            triggerTop: 100,
            triggerBottom: 138,
            popoverHeight: 242,
            viewportHeight: VIEWPORT,
        });

        expect(placement).toBe("below");
    });

    test("flips above when the list would run off the bottom", () => {
        const placement = resolvePopoverPlacement({
            triggerTop: 661,
            triggerBottom: 699,
            popoverHeight: 242,
            viewportHeight: VIEWPORT,
        });

        expect(placement).toBe("above");
    });

    test("stays below when neither side fits and below has the most room", () => {
        const placement = resolvePopoverPlacement({
            triggerTop: 40,
            triggerBottom: 78,
            popoverHeight: 900,
            viewportHeight: VIEWPORT,
        });

        expect(placement).toBe("below");
    });

    test("takes the exact fit below rather than flipping", () => {
        const placement = resolvePopoverPlacement({
            triggerTop: 460,
            triggerBottom: 498,
            popoverHeight: 242,
            viewportHeight: VIEWPORT,
        });

        expect(placement).toBe("below");
    });
});
