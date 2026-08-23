import { expect, test } from "../lib/fixtures.js";

/**
 * Teardown and runtime reconfiguration.
 *
 * Both are gaps the unit suites leave open: only jQuery asserted teardown, and
 * switching surfaces on a live instance is something the parity suite cannot
 * reach because it mounts a fresh instance per scenario.
 */

test("tearing the instance down leaves nothing behind", async ({ selectBox }) => {
    await selectBox.open();
    await expect(selectBox.root).toHaveCount(1);

    await selectBox.destroy();

    await expect(selectBox.root).toHaveCount(0);
    await expect(selectBox.trigger).toHaveCount(0);
    await expect(selectBox.popover).toHaveCount(0);
});

test("a click after teardown does not throw", async ({ selectBox, page }) => {
    await selectBox.open();
    await selectBox.openPopover();
    // Armed before the actions and awaited after: reading a buffer straight
    // after the click races the event and misses a real throw.
    const thrown = page.waitForEvent("pageerror", { timeout: 1_000 }).catch(() => null);

    await selectBox.destroy();
    await page.mouse.click(5, 5);

    expect(await thrown).toBeNull();
});

test("switching to the inline surface at runtime keeps one working instance", async ({
    selectBox,
}) => {
    await selectBox.open();
    await expect(selectBox.trigger).toBeVisible();

    await selectBox.toggleSurface();

    await expect(selectBox.inlineSurface).toBeVisible();
    await expect(selectBox.root).toHaveCount(1);
    await expect(selectBox.chips).toHaveCount(5);
});

test("switching back restores the popover surface", async ({ selectBox }) => {
    await selectBox.open({ surface: "inline" });
    await expect(selectBox.inlineSurface).toBeVisible();

    await selectBox.toggleSurface();

    await expect(selectBox.trigger).toBeVisible();
    await expect(selectBox.root).toHaveCount(1);
});

test("the instance still commits after a surface round trip", async ({ selectBox }) => {
    await selectBox.open();
    await selectBox.toggleSurface();
    await selectBox.toggleSurface();

    await selectBox.openPopover();
    await selectBox.options.filter({ hasText: "Pear" }).click();

    await expect(selectBox.input).toHaveValue("Pear");
});
