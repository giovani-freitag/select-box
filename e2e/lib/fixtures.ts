import { test as base } from "@playwright/test";

import { SelectBoxPage } from "./select-box-page.js";

/**
 * Test harness carrying which wrapper the current project exercises.
 *
 * `framework` is a worker-scoped option set per project, so a spec never names
 * a framework: it asks for `selectBox` and gets the right fixture.
 */
export const test = base.extend<{ selectBox: SelectBoxPage }, { framework: string }>({
    framework: ["react", { option: true, scope: "worker" }],
    selectBox: async ({ page, framework }, use) => {
        await use(new SelectBoxPage(page, framework));
    },
});

export { expect } from "@playwright/test";
