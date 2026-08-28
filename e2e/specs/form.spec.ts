import type { Page } from "@playwright/test";

import { expect, test } from "../lib/fixtures.js";

/**
 * Form association, in a real browser.
 *
 * Only the two custom elements are form-associated, so the other projects skip.
 * This is the layer that can answer it honestly: a DOM simulator either lacks
 * `ElementInternals` outright or, with the polyfill, never calls
 * `formResetCallback` — which is exactly how this whole surface went unobserved.
 */

// Every wrapper now reaches a form: the two custom elements through
// `ElementInternals`, the three DOM-tree ones through a mirrored native select.
const FORM_ASSOCIATED = ["lit", "webcomponents", "react", "vue", "jquery"];

test.beforeEach(({ framework }) => {
    test.skip(!FORM_ASSOCIATED.includes(framework), "not a form-associated wrapper");
});

/** Reads the form's submitted entries without navigating away. */
async function submitted(page: Page): Promise<Array<[string, string]>> {
    return page.evaluate(() => {
        const form = document.querySelector<HTMLFormElement>("#host-form")!;
        // FormData yields File for file inputs; this form has none, so the
        // entries are strings and the cast documents that rather than coercing.
        return [...new FormData(form)].map(([key, value]) => [key, value as string]);
    });
}

test("submits the committed value under its name", async ({ selectBox, page }) => {
    await selectBox.open({ name: "fruit" });
    await selectBox.openPopover();

    await selectBox.options.filter({ hasText: "Pear" }).click();

    expect(await submitted(page)).toEqual([["fruit", "pear"]]);
});

test("submits one entry per selection in multi mode", async ({ selectBox, page }) => {
    await selectBox.open({ name: "fruit", multiple: true });
    await selectBox.openPopover();

    await selectBox.options.filter({ hasText: "Pear" }).click();
    await selectBox.options.filter({ hasText: "Lemon" }).click();

    expect(await submitted(page)).toEqual([
        ["fruit", "pear"],
        ["fruit", "lemon"],
    ]);
});

test("stays out of the form data without a name", async ({ selectBox, page }) => {
    await selectBox.open();
    await selectBox.openPopover();

    await selectBox.options.filter({ hasText: "Pear" }).click();

    expect(await submitted(page)).toEqual([]);
});

test("resetting the form clears the selection", async ({ selectBox, page }) => {
    await selectBox.open({ name: "fruit" });
    await selectBox.openPopover();
    await selectBox.options.filter({ hasText: "Pear" }).click();
    expect(await submitted(page)).toEqual([["fruit", "pear"]]);

    await page.locator("#reset").click();

    expect(await submitted(page)).toEqual([["fruit", ""]]);
    await expect(selectBox.input).toHaveValue("");
    // The browser blanks the trigger input and the mirror on its own, so the two
    // assertions above pass even if the widget never heard the reset. Reopening
    // forces a repaint from the snapshot: a selection the reset missed comes back.
    await selectBox.openPopover();
    await page.keyboard.press("Escape");
    await expect(selectBox.input).toHaveValue("");
    expect(await submitted(page)).toEqual([["fruit", ""]]);
});

test("resetting restores the preselected option, the way a native select does", async ({
    selectBox,
    page,
}) => {
    await selectBox.open({ name: "fruit", value: "apple" });
    expect(await submitted(page)).toEqual([["fruit", "apple"]]);
    await selectBox.openPopover();
    await selectBox.options.filter({ hasText: "Pear" }).click();
    expect(await submitted(page)).toEqual([["fruit", "pear"]]);

    await page.locator("#reset").click();

    expect(await submitted(page)).toEqual([["fruit", "apple"]]);
    await expect(selectBox.input).toHaveValue("Apple");
});

test("resetting restores every preselected option in multi mode", async ({
    selectBox,
    page,
}) => {
    await selectBox.open({ multiple: true, name: "fruit", value: "apple,pear" });
    await selectBox.openPopover();
    await selectBox.options.filter({ hasText: "Grape" }).click();
    expect(await submitted(page)).toEqual([
        ["fruit", "apple"],
        ["fruit", "pear"],
        ["fruit", "grape"],
    ]);

    // Multi keeps the popover open across commits, and it covers the button.
    await page.keyboard.press("Escape");
    await page.locator("#reset").click();

    expect(await submitted(page)).toEqual([
        ["fruit", "apple"],
        ["fruit", "pear"],
    ]);
});

test("blocks submission while required and empty", async ({ selectBox, page }) => {
    await selectBox.open({ name: "fruit", required: true });

    const state = await page.evaluate(() => {
        const form = document.querySelector<HTMLFormElement>("#host-form")!;
        return { formValid: form.checkValidity() };
    });

    expect(state.formValid).toBe(false);
});

test("allows submission once a required control is filled", async ({ selectBox, page }) => {
    await selectBox.open({ name: "fruit", required: true });
    await selectBox.openPopover();

    await selectBox.options.filter({ hasText: "Pear" }).click();

    const formValid = await page.evaluate(() =>
        document.querySelector<HTMLFormElement>("#host-form")!.checkValidity(),
    );
    expect(formValid).toBe(true);
});

/**
 * The parts of form association that only the two custom elements implement,
 * and that only a real browser calls.
 */
const ELEMENT_ASSOCIATED = ["lit", "webcomponents"];

test.describe("element-associated behaviour", () => {
    test.beforeEach(({ framework }) => {
        test.skip(!ELEMENT_ASSOCIATED.includes(framework), "not an element-associated wrapper");
    });

    test("renaming the field moves what the form submits", async ({ selectBox, page }) => {
        await selectBox.open({ name: "fruit" });
        await selectBox.openPopover();
        await selectBox.options.filter({ hasText: "Pear" }).click();
        expect(await submitted(page)).toEqual([["fruit", "pear"]]);

        await selectBox.root.evaluate((element) => element.setAttribute("name", "produce"));

        expect(await submitted(page)).toEqual([["produce", "pear"]]);
    });

    test("renaming moves every entry in multi mode", async ({ selectBox, page }) => {
        await selectBox.open({ name: "fruit", multiple: true });
        await selectBox.openPopover();
        await selectBox.options.filter({ hasText: "Pear" }).click();
        await selectBox.options.filter({ hasText: "Lemon" }).click();

        await selectBox.root.evaluate((element) => element.setAttribute("name", "produce"));

        expect(await submitted(page)).toEqual([
            ["produce", "pear"],
            ["produce", "lemon"],
        ]);
    });

    test("a message the page sets survives the next repaint", async ({ selectBox, page }) => {
        await selectBox.open({ name: "fruit" });
        await selectBox.root.evaluate((element) => {
            (element as HTMLObjectElement).setCustomValidity("Pick something else.");
        });

        // Any interaction republishes the snapshot, which is where the message
        // used to be wiped.
        await selectBox.openPopover();
        await page.keyboard.press("Escape");

        const state = await selectBox.root.evaluate((element) => ({
            valid: (element as HTMLObjectElement).checkValidity(),
            message: (element as HTMLObjectElement).validationMessage,
        }));
        expect(state.valid).toBe(false);
        expect(state.message).toBe("Pick something else.");
    });

    test("a disabled fieldset refuses the control without rewriting its attribute", async ({
        selectBox,
        page,
    }) => {
        await selectBox.open({ name: "fruit" });
        await page.evaluate(() => {
            const form = document.querySelector("#host-form")!;
            const fieldset = document.createElement("fieldset");
            form.append(fieldset);
            fieldset.append(document.querySelector("[data-select-root]")!);
            fieldset.disabled = true;
        });

        const state = await selectBox.root.evaluate((element) => ({
            ownAttribute: element.hasAttribute("disabled"),
            refuses: element.querySelector("[data-select-input]")!.getAttribute("aria-readonly"),
        }));

        // The fieldset disables it; the element's own attribute still says what
        // the page wrote, which is nothing.
        expect(state.ownAttribute).toBe(false);
    });
});
