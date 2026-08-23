import { expect, test } from "../lib/fixtures.js";

test("renders a working picker with the shipped stylesheet", async ({ selectBox }) => {
    await selectBox.open();

    await expect(selectBox.trigger).toBeVisible();
    await expect(selectBox.input).toHaveAttribute("placeholder", "Pick a fruit");
    await expect(selectBox.popover).toBeHidden();
});

test("commits an option and reports the value", async ({ selectBox }) => {
    await selectBox.open();
    await selectBox.openPopover();

    await selectBox.options.filter({ hasText: "Grape" }).click();

    await expect(selectBox.input).toHaveValue("Grape");
    await expect(selectBox.lastChange).toHaveText('"grape"');
});
