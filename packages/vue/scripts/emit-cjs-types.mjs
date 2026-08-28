import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const DIST = new URL("../dist/", import.meta.url).pathname;

/**
 * Every `.d.ts` under `dist`, recursively.
 *
 * @param {string} directory - Absolute path to walk.
 * @returns {Promise<string[]>} Absolute paths of the declaration files found.
 */
async function declarationFiles(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    const found = [];
    for (const entry of entries) {
        const path = join(directory, entry.name);
        if (entry.isDirectory()) found.push(...(await declarationFiles(path)));
        else if (entry.name.endsWith(".d.ts")) found.push(path);
    }
    return found;
}

/**
 * Rewrites the relative specifiers in one declaration file.
 *
 * A single-file component is emitted as `Name.vue.d.ts`, so a specifier of
 * `./Name.vue` resolves nowhere: TypeScript looks up a declaration by swapping
 * a runtime extension for `.d.ts`, and `.vue` is not one it knows. Naming the
 * runtime file instead — `./Name.vue.js` — is what it can follow.
 *
 * @param {string} source - The declaration file's contents.
 * @param {".js" | ".cjs"} extension - Runtime extension the specifiers name.
 * @returns {string} The rewritten contents.
 */
function rewriteSpecifiers(source, extension) {
    return source
        .replace(/(["'])(\.{1,2}\/[^"']+\.vue)\1/g, `$1$2${extension}$1`)
        .replace(/(["'])(\.{1,2}\/[^"']+)\.js\1/g, `$1$2${extension}$1`);
}

const files = await declarationFiles(DIST);
for (const file of files) {
    const source = await readFile(file, "utf8");
    const body = source.replace(/^\/\/# sourceMappingURL=.*$/m, "").trimEnd();
    await writeFile(file, `${rewriteSpecifiers(source, ".js")}`);
    await writeFile(file.replace(/\.d\.ts$/, ".d.cts"), `${rewriteSpecifiers(body, ".cjs")}\n`);
}

console.log(`emit-cjs-types: rewrote ${files.length} declaration files`);
