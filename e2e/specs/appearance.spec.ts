import { expect, test } from "../lib/fixtures.js";

/**
 * The appearance the shipped stylesheet actually produces.
 *
 * Named properties only, never pixel snapshots: every defect this guards
 * against — a palette that ignored the reader's dark preference, an unstyled
 * search highlight, a control with no focus ring — is a property you can name.
 */

test.use({ colorScheme: "dark" });

test("the palette follows a dark preference", async ({ selectBox }) => {
    await selectBox.open();

    const background = await selectBox.trigger.evaluate(
        (element) => getComputedStyle(element).backgroundColor,
    );
    const [red, green, blue] = background.match(/\d+/g)!.map(Number) as [number, number, number];

    // A light surface under a dark preference is the regression: the sheet has to
    // opt into both schemes for the system colours to follow the reader.
    expect(red + green + blue).toBeLessThan(200);
});

test("every focusable control carries a focus ring", async ({ selectBox }) => {
    await selectBox.open();

    const unringed = await selectBox.root.evaluate((root) => {
        const missing: string[] = [];
        for (const control of root.querySelectorAll("button")) {
            // A hidden control cannot take focus, so `:focus-visible` would never
            // match and the check would report a ring that is simply unreachable.
            if (control.offsetParent === null) continue;
            control.focus();
            const style = getComputedStyle(control);
            const ringed =
                (style.outlineStyle !== "none" && style.outlineWidth !== "0px")
                || style.boxShadow !== "none";
            if (!ringed) missing.push(control.className || control.tagName);
        }
        return missing;
    });

    expect(unringed).toEqual([]);
});

test("a search match is marked without the browser's default highlight", async ({ selectBox }) => {
    await selectBox.open();
    await selectBox.openPopover();
    await selectBox.type("ea");

    const mark = selectBox.root.locator("[data-select-option] mark, .select-box-option-match");
    await expect(mark.first()).toBeVisible();
    const background = await mark
        .first()
        .evaluate((element) => getComputedStyle(element).backgroundColor);

    // The UA paints <mark> yellow; an unstyled highlight is the regression.
    expect(background).toBe("rgba(0, 0, 0, 0)");
});
