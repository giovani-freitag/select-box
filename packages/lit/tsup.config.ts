import { defineConfig } from "tsup";

export default defineConfig({
    entry: ["src/index.ts", "src/define.ts"],
    format: ["esm", "cjs"],
    dts: true,
    sourcemap: true,
    clean: true,
    target: "es2022",
    treeshake: true,
    external: ["@select-box/core", "lit"],
});
