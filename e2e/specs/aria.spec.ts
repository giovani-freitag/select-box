import { expect, test } from "../lib/fixtures.js";

/**
 * What an assistive technology is actually told.
 *
 * DOM queries prove an attribute exists; role queries go through the browser's
 * own accessibility mapping, so a role that never made it out of the markup, or
 * a control with no accessible name, shows up here and nowhere else.
 */

test("exposes the trigger as a combobox", async ({ selectBox, page }) => {
    await selectBox.open();

    await expect(page.getByRole("combobox")).toBeVisible();
});

test("announces the expanded state as the popover opens", async ({ selectBox }) => {
    await selectBox.open();
    await expect(selectBox.combobox).toHaveAttribute("aria-expanded", "false");

    await selectBox.openPopover();

    await expect(selectBox.combobox).toHaveAttribute("aria-expanded", "true");
});

test("exposes the popover as a listbox of options", async ({ selectBox, page }) => {
    await selectBox.open();
    await selectBox.openPopover();

    await expect(page.getByRole("listbox")).toBeVisible();
    expect(await page.getByRole("option").count()).toBeGreaterThan(0);
});

test("points the combobox at the row the keyboard is on", async ({ selectBox, page }) => {
    await selectBox.open();
    await selectBox.openPopover();
    await page.keyboard.press("ArrowDown");

    const active = await selectBox.combobox.getAttribute("aria-activedescendant");

    expect(active).not.toBeNull();
    await expect(page.locator(`[id="${active}"]`)).toHaveAttribute("data-select-active", "");
});

test("exposes exactly the selected row as selected", async ({ selectBox, page }) => {
    await selectBox.open({ multiple: true });
    await selectBox.openPopover();

    await selectBox.options.first().click();

    expect(await page.getByRole("option", { selected: true }).count()).toBe(1);
});

test("announces multi-selectability on the listbox", async ({ selectBox, page }) => {
    await selectBox.open({ multiple: true });
    await selectBox.openPopover();

    await expect(page.getByRole("listbox")).toHaveAttribute("aria-multiselectable", "true");
});

test("keeps the option rows out of the tab order", async ({ selectBox, page }) => {
    await selectBox.open();
    await selectBox.openPopover();

    await page.keyboard.press("Tab");

    expect(
        await page.evaluate(() => document.activeElement?.getAttribute("data-select-option")),
    ).toBeNull();
});

test("gives the clear control an accessible name", async ({ selectBox, page }) => {
    await selectBox.open({ multiple: true });
    await selectBox.openPopover();
    await selectBox.options.first().click();

    await expect(page.getByRole("button", { name: /clear/i })).toBeVisible();
});

test("names each chip's remove control after its own option", async ({ selectBox, page }) => {
    await selectBox.open({ multiple: true });
    await selectBox.openPopover();
    const label = ((await selectBox.options.first().textContent()) ?? "").trim();
    await selectBox.options.first().click();

    await expect(
        page.getByRole("button", { name: new RegExp(`remove ${label}`, "i") }),
    ).toBeVisible();
});

test("carries the accessible name a consumer put on the box", async ({ selectBox, page }) => {
    await selectBox.open({ label: "Favourite fruit" });

    await expect(page.getByRole("combobox", { name: "Favourite fruit" })).toBeVisible();
});

test("the group header is not announced as an option", async ({ selectBox, page }) => {
    await selectBox.open({ groups: true });
    await selectBox.openPopover();

    const options = await page.getByRole("option").allTextContents();

    expect(options.some((text) => text.trim() === "Pomes")).toBe(false);
});

/**
 * A row that refuses input carries the ARIA state, not the native attribute.
 *
 * The role is already overridden to `option`, so the disabled state belongs in
 * ARIA next to it. It also keeps the row focusable and hoverable, which is what
 * a read-only control does — and it puts the refusal in the click handler, one
 * path for both the option's own flag and the control's.
 */
test("marks a row that refuses input with the ARIA state", async ({ selectBox }) => {
    await selectBox.open({ disabled: true });
    await selectBox.openPopover();

    const row = selectBox.options.filter({ hasText: "Pear" });

    await expect(row).toHaveAttribute("aria-disabled", "true");
});

// `toBeEnabled` honours `aria-disabled`, so it cannot tell the two mechanisms
// apart. The native property is what this pins.
test("leaves the native disabled attribute off that row", async ({ selectBox }) => {
    await selectBox.open({ disabled: true });
    await selectBox.openPopover();

    const natively = await selectBox.options
        .filter({ hasText: "Pear" })
        .evaluate((row) => (row as HTMLButtonElement).disabled);

    expect(natively).toBe(false);
});

/**
 * Grouping is structural in ARIA: the options have to sit inside a named
 * container. A bare `<div>` between a listbox and its options is not a valid
 * child, gets dropped, and leaves the grouping on screen but not in the tree.
 * Only the browser's own tree shows that, which is why this lives here.
 */
test("announces each group the list shows", async ({ selectBox, page }) => {
    await selectBox.open({ groups: true });
    await selectBox.openPopover();

    const session = await page.context().newCDPSession(page);
    const { nodes } = (await session.send("Accessibility.getFullAXTree")) as {
        nodes: ReadonlyArray<{
            role?: { value?: string };
            name?: { value?: string };
            ignored?: boolean;
        }>;
    };
    await session.detach();

    const announced = nodes
        .filter((node) => node.ignored !== true && node.role?.value === "group")
        .map((node) => (node.name?.value ?? "").trim());

    expect(announced).toContain("Pomes");
});
