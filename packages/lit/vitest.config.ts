import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        include: ["tests/**/*.test.ts"],
        // jsdom, not happy-dom: the component calls `attachInternals()` in a field
        // initializer and happy-dom ships no `ElementInternals`, so it cannot be
        // constructed there at all. jsdom's is real, so form association is
        // exercised rather than stubbed away per test file.
        environment: "jsdom",
        setupFiles: ["element-internals-polyfill"],
    },
});
