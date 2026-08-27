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
        // `astro preview` daemonizes itself when it thinks a coding agent is
        // driving the terminal, and a command that returns immediately reads to
        // Playwright as a server that died. Any non-empty value turns the
        // detection off and keeps the process in the foreground.
        env: { ASTRO_PREVIEW_BACKGROUND: "0" },
        // The site is served under a sub-path, so the root 404s and Playwright
        // would wait out the whole timeout on a server that is already up.
        url: "http://localhost:4331/select-box/",
        reuseExistingServer: process.env["CI"] !== "true",
        timeout: 120_000,
    },
});
