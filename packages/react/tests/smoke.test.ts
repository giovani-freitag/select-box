import { expect, test } from "vitest";

import { packageName, SingleSelectBoxController, useSelectBox } from "../src/index.js";

test("wrapper re-exports controller, hook, and package name", () => {
    expect(packageName).toBe("@select-box/react");
    expect(typeof useSelectBox).toBe("function");
    expect(typeof SingleSelectBoxController).toBe("function");
});
