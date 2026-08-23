import { defineConfig, devices } from "@playwright/test";

const FRAMEWORKS = ["react", "vue", "lit", "webcomponents", "jquery"] as const;

/**
 * One project per wrapper, all running the same specs.
 *
 * A core regression fails every column at once; a wrapper regression fails only
 * its own, which is what makes the output diagnose the layer immediately.
 */
export default defineConfig({
    testDir: "./specs",
    fullyParallel: true,
    forbidOnly: process.env["CI"] === "true",
    retries: process.env["CI"] === "true" ? 1 : 0,
    reporter: process.env["CI"] === "true" ? [["github"], ["html", { open: "never" }]] : [["list"]],
    use: {
        baseURL: "http://localhost:4330",
        trace: "retain-on-failure",
    },
    projects: FRAMEWORKS.map((framework) => ({
        name: framework,
        use: { ...devices["Desktop Chrome"], framework },
    })),
    webServer: {
        command: "pnpm exec vite --config vite.config.ts",
        url: "http://localhost:4330/react.html",
        reuseExistingServer: process.env["CI"] !== "true",
        timeout: 60_000,
    },
});
