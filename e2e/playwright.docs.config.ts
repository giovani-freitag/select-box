import { defineConfig, devices } from "@playwright/test";

/**
 * Guard over the demos the docs site actually ships.
 *
 * Kept in its own config so the wrapper matrix never has to build the docs:
 * `playwright.config.ts` serves the fixture app, this one serves the built site.
 * The site's `<script>` blocks are neither linted nor type-checked (Astro's
 * virtual modules defeat `astro check`), so a demo that throws at load or wires
 * an event the wrapper never fires ships green. This layer is what catches it.
 */
export default defineConfig({
    testDir: "./docs-specs",
    fullyParallel: true,
    forbidOnly: process.env["CI"] === "true",
    retries: process.env["CI"] === "true" ? 1 : 0,
    reporter: process.env["CI"] === "true"
        ? [["github"], ["html", { open: "never", outputFolder: "playwright-report-docs" }]]
        : [["list"]],
    use: {
        ...devices["Desktop Chrome"],
        baseURL: "http://localhost:4331",
        trace: "retain-on-failure",
    },
    webServer: {
        command: "pnpm --filter docs-starlight exec astro preview --port 4331",
        url: "http://localhost:4331/",
        reuseExistingServer: process.env["CI"] !== "true",
        timeout: 120_000,
    },
});
