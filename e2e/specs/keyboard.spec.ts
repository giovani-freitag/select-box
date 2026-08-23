import { expect, test } from "../lib/fixtures.js";

/**
 * Arrow-key navigation and focus, in a real browser.
 *
 * Focus and key handling are the parts a JSDOM suite models least faithfully,
 * and arrow navigation was the gap the per-wrapper suites never closed.
 */

test("ArrowDown opens the popover when it is closed", async ({ selectBox }) => {
    await selectBox.open();

    await selectBox.pressKey("ArrowDown");

    await expect(selectBox.popover).toBeVisible();
});

test("ArrowDown walks the active option down the list", async ({ selectBox }) => {
    await selectBox.open();
    await selectBox.openPopover();
    await expect(selectBox.activeOption).toHaveText("Apple");

    await selectBox.pressKey("ArrowDown");

    await expect(selectBox.activeOption).toHaveText("Pear");
});

test("ArrowUp walks it back", async ({ selectBox }) => {
    await selectBox.open();
    await selectBox.openPopover();
    await selectBox.pressKey("ArrowDown");
    await selectBox.pressKey("ArrowDown");
    await expect(selectBox.activeOption).toHaveText("Grape");

    await selectBox.pressKey("ArrowUp");

    await expect(selectBox.activeOption).toHaveText("Pear");
});

test("exactly one option is active at a time", async ({ selectBox }) => {
    await selectBox.open();
    await selectBox.openPopover();

    await selectBox.pressKey("ArrowDown");

    await expect(selectBox.activeOption).toHaveCount(1);
});

test("Enter commits whatever is active", async ({ selectBox }) => {
    await selectBox.open();
    await selectBox.openPopover();
    await selectBox.pressKey("ArrowDown");

    await selectBox.pressKey("Enter");

    await expect(selectBox.input).toHaveValue("Pear");
    await expect(selectBox.popover).toBeHidden();
});

test("the highlighted row is the one Enter commits", async ({ selectBox }) => {
    await selectBox.open({ disabled: true });
    await selectBox.openPopover();
    await selectBox.pressKey("ArrowDown");
    // Two places decide which rows are navigable — the controller's flat list
    // and the row model that maps the active index back to a rendered row. If
    // they disagree, the highlight and the commit point at different options.
    const highlighted = (await selectBox.activeOption.innerText()).trim();

    await selectBox.pressKey("Enter");

    await expect(selectBox.input).toHaveValue(highlighted);
});

test("navigation skips disabled rows", async ({ selectBox }) => {
    await selectBox.open({ disabled: true });
    await selectBox.openPopover();

    await selectBox.pressKey("ArrowDown");

    await expect(selectBox.activeOption).toHaveText("Grape");
});

test("the trigger input holds focus while navigating", async ({ selectBox }) => {
    await selectBox.open();
    await selectBox.openPopover();

    await selectBox.pressKey("ArrowDown");

    await expect(selectBox.input).toBeFocused();
});

test("Tab leaves the component instead of landing on the caret", async ({ selectBox, page }) => {
    await selectBox.open();
    await selectBox.input.focus();

    await page.keyboard.press("Tab");

    // Asserting only that the caret is not focused would also pass when the
    // caret does not exist, so this checks focus left the widget entirely.
    const landedInside = await page.evaluate(
        () => document.activeElement?.closest("[data-select-root]") !== null,
    );
    expect(landedInside).toBe(false);
});
