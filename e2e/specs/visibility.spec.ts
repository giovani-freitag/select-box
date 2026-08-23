import { expect, test } from "../lib/fixtures.js";

/**
 * What the user can actually see, with the shipped stylesheet applied.
 *
 * JSDOM cannot answer this: it loads no CSS, so a suite there can only check
 * that a wrapper *said* a part does not apply. Every regression this file
 * guards against was a rule that outranked `[hidden]` and put the part back on
 * screen while the attribute stayed correct.
 */

test("single mode offers a caret and no clear button", async ({ selectBox }) => {
    await selectBox.open();

    await expect(selectBox.caret).toBeVisible();
    await expect(selectBox.clear).toBeHidden();
});

test("multi mode offers no caret", async ({ selectBox }) => {
    await selectBox.open({ multi: true });

    await expect(selectBox.caret).toBeHidden();
});

test("the clear button appears only once something is selected", async ({ selectBox }) => {
    await selectBox.open({ multi: true });
    await expect(selectBox.clear).toBeHidden();
    await selectBox.openPopover();

    await selectBox.options.filter({ hasText: "Apple" }).click();

    await expect(selectBox.clear).toBeVisible();
});

test("clearing puts the clear button away again", async ({ selectBox }) => {
    await selectBox.open({ multi: true });
    await selectBox.openPopover();
    await selectBox.options.filter({ hasText: "Apple" }).click();

    await selectBox.clear.click();

    await expect(selectBox.chips).toHaveCount(0);
    await expect(selectBox.clear).toBeHidden();
});

test("the inline surface shows no trigger input and no popover", async ({ selectBox }) => {
    await selectBox.open({ surface: "inline" });

    await expect(selectBox.inlineSurface).toBeVisible();
    await expect(selectBox.input).toBeHidden();
    await expect(selectBox.popover).toBeHidden();
});

test("the popover surface shows no inline chip row", async ({ selectBox }) => {
    await selectBox.open();

    await expect(selectBox.trigger).toBeVisible();
    await expect(selectBox.inlineSurface).toBeHidden();
});

test("Escape puts the popover away", async ({ selectBox }) => {
    await selectBox.open();
    await selectBox.openPopover();

    await selectBox.pressKey("Escape");

    await expect(selectBox.popover).toBeHidden();
});
