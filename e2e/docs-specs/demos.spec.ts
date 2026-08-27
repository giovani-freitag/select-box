import { expect, test, type ConsoleMessage, type Page } from "@playwright/test";

/**
 * Every framework tab that a demo group renders, by its visible label.
 *
 * All five panels are in the DOM at once — the tabs only toggle `hidden` — so a
 * single page load mounts every wrapper, and a demo that throws at load shows up
 * without the tab ever being clicked.
 */
const FRAMEWORK_TABS = ["jQuery", "Lit", "React", "Vue", "Web Components"] as const;

/**
 * The sub-path the built site is served under, mirroring `base` in the Astro
 * config. Paths below stay site-root so they read as the site's own routes.
 */
const SITE_BASE = "/select-box";

/** Pages carrying a framework demo group, each with what a commit should do. */
const DEMO_PAGES = [
    { path: "/", surface: "popover" },
    { path: "/examples/simple/", surface: "popover" },
    { path: "/examples/select-box/", surface: "popover" },
    { path: "/examples/optgroup/", surface: "popover" },
    { path: "/examples/search/", surface: "popover" },
    { path: "/examples/disabled/", surface: "popover" },
    { path: "/examples/large-list/", surface: "popover" },
    { path: "/examples/multi-select/", surface: "popover", multi: true },
    { path: "/examples/inline-select/", surface: "inline" },
] as const;

/**
 * Collects everything the browser complains about, so a demo cannot fail
 * silently. An uncaught `TypeError` from a broken call chain lands here.
 */
function watchForFailures(page: Page): { readonly messages: string[] } {
    const messages: string[] = [];
    page.on("pageerror", (error) => messages.push(`pageerror: ${error.message}`));
    page.on("console", (message: ConsoleMessage) => {
        if (message.type() === "error") messages.push(`console: ${message.text()}`);
    });
    return { messages };
}

for (const demo of DEMO_PAGES) {
    test(`every framework demo renders on ${demo.path}`, async ({ page }) => {
        const failures = watchForFailures(page);

        await page.goto(`${SITE_BASE}${demo.path}`);
        const roots = page.locator("[data-select-root]");
        await expect(roots.first()).toBeAttached();

        // One root per framework, all mounted from the same page load.
        expect(await roots.count()).toBeGreaterThanOrEqual(FRAMEWORK_TABS.length);
        expect(failures.messages).toEqual([]);
    });

    test(`every framework demo on ${demo.path} commits a selection`, async ({ page }) => {
        const failures = watchForFailures(page);
        await page.goto(`${SITE_BASE}${demo.path}`);

        for (const tab of FRAMEWORK_TABS) {
            await page.getByRole("tab", { name: tab, exact: true }).first().click();
            const panel = page
                .locator('[role="tabpanel"]:not([hidden])')
                .filter({ has: page.locator("[data-select-root]") })
                .first();
            const root = panel.locator("[data-select-root]").first();
            await expect(root, `${tab} demo missing on ${demo.path}`).toBeVisible();

            if (demo.surface === "inline") {
                const chip = root.locator("[data-select-chip]").first();
                await chip.click();
                await expect(root.locator("[data-select-selected]").first()).toBeAttached();
                continue;
            }

            await root.locator("[data-select-input]").click();
            const option = root.locator("[data-select-option]").first();
            await expect(option, `${tab} popover never opened on ${demo.path}`).toBeVisible();
            const label = ((await option.textContent()) ?? "").trim();
            await option.click();

            // Committing has to reach the trigger, which is the wiring a broken
            // demo script silently skips. Multi puts the label in a chip and
            // leaves the input free for the next search.
            if ("multi" in demo && demo.multi === true) {
                await expect(root.locator("[data-select-chip]").first()).toHaveText(
                    new RegExp(label),
                );
            } else {
                await expect(root.locator("[data-select-input]")).toHaveValue(label);
            }
        }

        expect(failures.messages).toEqual([]);
    });
}

test("the demo output reports the committed value", async ({ page }) => {
    const failures = watchForFailures(page);
    await page.goto(`${SITE_BASE}/examples/simple/`);

    for (const tab of FRAMEWORK_TABS) {
        await page.getByRole("tab", { name: tab, exact: true }).first().click();
        const panel = page.locator('[role="tabpanel"]:not([hidden])').first();
        const output = panel.locator("output");
        await expect(output, `${tab} demo has no output`).toBeVisible();
        await expect(output).toHaveText("null");

        const root = panel.locator("[data-select-root]").first();
        await root.locator("[data-select-input]").click();
        await root.locator("[data-select-option]").first().click();

        // The `<output>` is wired by the demo's own script — the exact wiring
        // that broke when the plugin stopped returning a jQuery collection.
        await expect(output, `${tab} demo never reported its change`).not.toHaveText("null");
    }

    expect(failures.messages).toEqual([]);
});
