import { describe, expect, test } from "vitest";

import * as lit from "../src/index.js";

describe("the package barrel", () => {
    test("publishes the reactive controller under Lit's own name for the pattern", () => {
        expect(lit.SelectBoxReactiveController).toBeTypeOf("function");
    });

    test("publishes the core controller under the name every wrapper shares", () => {
        expect(lit.SelectBoxController).toBeTypeOf("function");
    });

    test("keeps them apart, so `element.controller` has a nameable type here", () => {
        expect(lit.SelectBoxReactiveController).not.toBe(lit.SelectBoxController);
    });
});
