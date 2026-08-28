import { expect, test, type Locator } from "@playwright/test";

/**
 * Where the page's shell puts its content, on a wide viewport.
 *
 * The site overrides four of Starlight's layout components, so its geometry
 * comes from our CSS competing with Starlight's on the same elements. A version
 * bump that reorders or rescopes those rules leaves every demo working and
 * every link resolving while the page is laid out wrong — which is exactly how
 * the landing page ended up in an 784px column, aligned to nothing.
 */

const SITE_BASE = "/select-box";

/** The sub-path the built site is served under, mirroring `base` in the Astro config. */
async function box(locator: Locator): Promise<{ left: number; right: number }> {
    const rect = (await locator.boundingBox())!;
    return { left: Math.round(rect.x), right: Math.round(rect.x + rect.width) };
}

test.use({ viewport: { width: 1920, height: 900 } });

test("the landing page fills the shell the header is aligned to", async ({ page }) => {
    await page.goto(`${SITE_BASE}/`);

    const header = await box(page.locator(".header").first());
    const content = await box(page.locator(".sb-doc-content-inner").first());

    expect(Math.abs(content.left - header.left)).toBeLessThanOrEqual(2);
    expect(Math.abs(content.right - header.right)).toBeLessThanOrEqual(2);
});

test("a documentation page keeps its three columns inside that shell", async ({ page }) => {
    await page.goto(`${SITE_BASE}/guides/addons/`);

    const header = await box(page.locator(".header").first());
    const sidebar = await box(page.locator(".sb-sidebar").first());
    const content = await box(page.locator(".sb-doc-content-inner").first());
    const toc = await box(page.locator(".sb-doc-aside").first());

    // Left to right, none of them escaping the shell.
    expect(sidebar.left).toBeGreaterThanOrEqual(header.left - 2);
    expect(sidebar.right).toBeLessThanOrEqual(content.left);
    expect(content.right).toBeLessThanOrEqual(toc.left);
    expect(toc.right).toBeLessThanOrEqual(header.right + 2);
});

test("no page scrolls sideways", async ({ page }) => {
    for (const path of ["/", "/guides/addons/", "/guides/forms/", "/examples/playground/"]) {
        await page.goto(`${SITE_BASE}${path}`);

        const overflow = await page.evaluate(() => {
            const root = document.documentElement;
            return root.scrollWidth - root.clientWidth;
        });

        expect(overflow, `${path} scrolls sideways`).toBeLessThanOrEqual(0);
    }
});
