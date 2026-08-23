import { expect, test } from "../lib/fixtures.js";

/**
 * Windowed rendering over a large list.
 *
 * Needs real layout: the virtualizer measures scroll height and row offsets,
 * and JSDOM reports zero for both.
 */

const LARGE = 10_000;

test("renders a window instead of every row", async ({ selectBox }) => {
    await selectBox.open({ count: LARGE });

    await selectBox.openPopover();

    const rendered = await selectBox.options.count();
    expect(rendered).toBeGreaterThan(0);
    expect(rendered).toBeLessThan(100);
});

test("the scroll range covers the whole list, not just the window", async ({ selectBox }) => {
    await selectBox.open({ count: LARGE });
    await selectBox.openPopover();

    const { scrollHeight, clientHeight } = await selectBox.list.evaluate((element) => ({
        scrollHeight: element.scrollHeight,
        clientHeight: element.clientHeight,
    }));

    expect(scrollHeight).toBeGreaterThan(clientHeight * 50);
});

test("scrolling swaps the rendered rows", async ({ selectBox }) => {
    await selectBox.open({ count: LARGE });
    await selectBox.openPopover();
    const before = await selectBox.optionLabels();

    await selectBox.list.evaluate((element) => {
        element.scrollTop = 5000;
    });
    await expect(selectBox.options.first()).not.toHaveText(before[0]!);

    const after = await selectBox.optionLabels();
    expect(after).not.toEqual(before);
    expect(await selectBox.options.count()).toBeLessThan(100);
});

test("typing filters a large list down to the matches", async ({ selectBox }) => {
    await selectBox.open({ count: LARGE });
    await selectBox.openPopover();

    await selectBox.type("Option 9999");

    await expect(selectBox.options).toHaveCount(1);
    await expect(selectBox.options.first()).toHaveText("Option 9999");
});
