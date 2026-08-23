import { expect, test } from "../lib/fixtures.js";

/**
 * Where the popover lands, measured in real layout.
 *
 * The regression this guards against is a stacking or containing-block mistake:
 * the popover is absolutely positioned against the root, so anything that
 * changes the root's height or its `position` moves the panel somewhere wrong
 * while every attribute stays correct.
 */

test("the popover sits directly under the trigger, aligned and matching width", async ({
    selectBox,
}) => {
    await selectBox.open();
    await selectBox.openPopover();

    const trigger = (await selectBox.trigger.boundingBox())!;
    const popover = (await selectBox.popover.boundingBox())!;

    expect(popover.y - (trigger.y + trigger.height)).toBeLessThanOrEqual(8);
    expect(popover.y).toBeGreaterThan(trigger.y);
    expect(Math.abs(popover.x - trigger.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(popover.width - trigger.width)).toBeLessThanOrEqual(1);
});

test("the popover paints above the content that follows it", async ({ selectBox, page }) => {
    await selectBox.open();
    await selectBox.openPopover();

    const popoverBox = (await selectBox.popover.boundingBox())!;
    // Reports what is actually on top rather than a boolean: an empty point and
    // a wrong element are different failures, and `?.` on a null hit would have
    // made the boolean form pass either way.
    const topmost = await page.evaluate(
        ([x, y]) => {
            const element = document.elementFromPoint(x!, y!);
            if (element === null) return "nothing";
            return element.closest("[data-select-popover]") === null
                ? `outside: ${element.tagName.toLowerCase()}`
                : "popover";
        },
        [popoverBox.x + popoverBox.width / 2, popoverBox.y + 10],
    );

    expect(topmost).toBe("popover");
});

test("the list scrolls inside the popover rather than growing it", async ({ selectBox }) => {
    await selectBox.open({ count: 500 });
    await selectBox.openPopover();

    const popover = (await selectBox.popover.boundingBox())!;
    const { scrollHeight } = await selectBox.list.evaluate((element) => ({
        scrollHeight: element.scrollHeight,
    }));

    expect(popover.height).toBeLessThan(400);
    expect(scrollHeight).toBeGreaterThan(popover.height);
});
