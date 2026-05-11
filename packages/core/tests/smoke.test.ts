import { expect, test } from "vitest";

import { packageName } from "../src/index.js";

test("package name is exported", () => {
    expect(packageName).toBe("@select-box/core");
});
