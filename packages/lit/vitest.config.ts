import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        include: ["tests/**/*.test.ts"],
        // jsdom, not happy-dom: the component calls `attachInternals()` in a field
        // initializer and happy-dom 15 ships no ElementInternals, so it cannot be
        // constructed there at all.
        environment: "jsdom",
        // A real ElementInternals, so form association is exercised instead of
        // stubbed away per test file.
        setupFiles: ["element-internals-polyfill"],
    },
});
