import { defineConfig } from "vite";

export default defineConfig({
    server: { port: 5174 },
    optimizeDeps: {
        exclude: ["@select-box/core", "@select-box/webcomponents"],
    },
});
