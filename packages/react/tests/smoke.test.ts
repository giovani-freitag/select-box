import { expect, test } from "vitest";

import { corePackageName, packageName } from "../src/index.js";

test("wrapper re-exports core package name and exposes its own", () => {
    expect(packageName).toBe("@select-box/react");
    expect(corePackageName).toBe("@select-box/core");
});
