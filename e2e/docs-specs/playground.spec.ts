import { expect, test, type ConsoleMessage, type Page } from "@playwright/test";

/**
 * The sub-path the built site is served under, mirroring `base` in the Astro
 * config.
 */
const SITE_BASE = "/select-box";

const PLAYGROUND = `${SITE_BASE}/examples/playground/`;

/** Every knob the page offers, by the accessible name it publishes. */
const KNOBS = ["Surface", "Selection", "Options", "Rows", "State", "Addons"] as const;

function watchForFailures(page: Page): { readonly messages: string[] } {
    const messages: string[] = [];
    page.on("pageerror", (error) => messages.push(`pageerror: ${error.message}`));
    page.on("console", (message: ConsoleMessage) => {
        if (message.type() === "error") messages.push(`console: ${message.text()}`);
    });
    return { messages };
}

test("the playground mounts every knob and a preview", async ({ page }) => {
    const failures = watchForFailures(page);

    await page.goto(PLAYGROUND);

    // Each knob is an inline select box: a listbox of chips, named after the
    // setting it drives.
    for (const knob of KNOBS) {
        await expect(page.getByRole("listbox", { name: knob, exact: true })).toBeVisible();
    }
    await expect(page.locator(".sb-playground-stage [data-select-root]")).toBeVisible();
    expect(failures.messages).toEqual([]);
});

test("switching the surface knob repaints the preview and the snippet", async ({ page }) => {
    const failures = watchForFailures(page);
    await page.goto(PLAYGROUND);

    const preview = page.locator(".sb-playground-stage [data-select-root]");
    const snippet = page.locator(".sb-playground-code code");

    // Only the popover surface renders a trigger, and only the inline surface
    // marks itself, so the pair distinguishes them without opening anything.
    await expect(preview.locator("[data-select-trigger]")).toBeVisible();
    await expect(preview.locator("[data-select-surface='inline']")).toHaveCount(0);
    await expect(snippet).not.toContainText('surface="inline"');

    await page
        .getByRole("listbox", { name: "Surface", exact: true })
        .getByRole("option", { name: "Inline", exact: true })
        .click();

    await expect(preview.locator("[data-select-surface='inline']")).toBeVisible();
    await expect(preview.locator("[data-select-trigger]")).toHaveCount(0);
    await expect(preview.locator("[data-select-chip]").first()).toBeVisible();
    await expect(snippet).toContainText('surface="inline"');
    expect(failures.messages).toEqual([]);
});

test("switching to multi keeps the same instance and lets it hold two picks", async ({ page }) => {
    const failures = watchForFailures(page);
    await page.goto(PLAYGROUND);

    await page
        .getByRole("listbox", { name: "Selection", exact: true })
        .getByRole("option", { name: "Multiple", exact: true })
        .click();

    const preview = page.locator(".sb-playground-stage [data-select-root]");
    await expect(preview).toHaveAttribute("data-select-mode", "multi");

    await preview.locator("[data-select-input]").click();
    await page.locator('.sb-playground-stage [role="option"]').nth(0).click();
    await page.locator('.sb-playground-stage [role="option"]').nth(1).click();


    await expect(page.locator(".sb-playground-value")).toContainText(",");
    await expect(page.locator(".sb-playground-code code")).toContainText("multi");
    expect(failures.messages).toEqual([]);
});
