import vue from "@vitejs/plugin-vue";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const packageRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
    plugins: [vue()],
    build: {
        target: "es2022",
        sourcemap: true,
        emptyOutDir: true,
        lib: {
            entry: resolve(packageRoot, "src/index.ts"),
            formats: ["es", "cjs"],
            fileName: (format) => (format === "es" ? "index.js" : "index.cjs"),
        },
        rollupOptions: {
            external: ["vue", "@select-box/core"],
        },
    },
});
