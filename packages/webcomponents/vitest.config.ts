import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        include: ["tests/**/*.test.ts"],
        // happy-dom is held at an exact version here. From 20.3.3 on it delivers
        // MutationObserver records in a microtask, the way a browser does, and
        // the ElementInternals polyfill this suite needs then answers its own
        // callback with more mutations and never yields. jsdom, which also
        // delivers in a microtask, livelocks the same way.
        environment: "happy-dom",
        setupFiles: ["element-internals-polyfill"],
    },
});
