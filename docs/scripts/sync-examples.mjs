/**
 * Builds every framework example via vite and copies its `dist/` into
 * `docs/public/examples/<framework>/`, where VitePress serves them as
 * static files. The combobox demo page iframes those paths.
 *
 * Run before `vitepress dev` and `vitepress build`. Idempotent — runs
 * each example's build script and replaces the target folder.
 */
import { execSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const docsRoot = resolve(__dirname, "..");
const repoRoot = resolve(docsRoot, "..");
const publicExamplesDir = resolve(docsRoot, "public", "examples");

const examples = [
    { framework: "react", packageName: "@select-box/example-react" },
    { framework: "webcomponents", packageName: "@select-box/example-webcomponents" },
];

for (const example of examples) {
    const exampleRoot = resolve(repoRoot, "examples", example.framework);
    if (!existsSync(exampleRoot)) {
        console.warn(`[sync-examples] skipping ${example.framework}: ${exampleRoot} does not exist`);
        continue;
    }

    console.log(`[sync-examples] building ${example.framework}`);
    const basePath = `/examples/${example.framework}/`;
    execSync(`pnpm --filter ${example.packageName} exec vite build --base ${basePath}`, {
        cwd: repoRoot,
        stdio: "inherit",
    });

    const sourceDist = resolve(exampleRoot, "dist");
    const targetDir = resolve(publicExamplesDir, example.framework);

    if (existsSync(targetDir)) rmSync(targetDir, { recursive: true });
    mkdirSync(targetDir, { recursive: true });
    cpSync(sourceDist, targetDir, { recursive: true });

    console.log(`[sync-examples] copied ${example.framework} → ${targetDir}`);
}

console.log("[sync-examples] done");
