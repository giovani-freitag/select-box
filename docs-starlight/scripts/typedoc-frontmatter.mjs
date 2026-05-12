#!/usr/bin/env node
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const API_DIR = join(process.cwd(), "src/content/docs/api");

async function walk(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
        const path = join(directory, entry.name);
        if (entry.isDirectory()) {
            files.push(...(await walk(path)));
        } else if (entry.name.endsWith(".md")) {
            files.push(path);
        }
    }
    return files;
}

function stripMarkdown(text) {
    return text
        .replace(/`+/g, "")
        .replace(/[*_~]+/g, "")
        .replace(/\\([<>])/g, "$1")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        .replace(/<[^>]+>/g, "")
        .replace(/\\/g, "")
        .trim();
}

function escapeYaml(value) {
    return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

async function prependFrontmatter(file) {
    const raw = await readFile(file, "utf8");
    if (raw.startsWith("---\n")) return;

    const headingMatch = raw.match(/^#\s+(.+)$/m);
    const heading = headingMatch ? stripMarkdown(headingMatch[1]) : null;
    const fallback = file.split("/").pop().replace(/\.md$/, "");
    const title = heading || fallback;

    const frontmatter = [
        "---",
        `title: "${escapeYaml(title)}"`,
        `sidebar:`,
        `    label: "${escapeYaml(title)}"`,
        `editUrl: false`,
        `next: false`,
        `prev: false`,
        "---",
        "",
    ].join("\n");

    await writeFile(file, frontmatter + raw, "utf8");
}

async function main() {
    const files = await walk(API_DIR);
    await Promise.all(files.map(prependFrontmatter));
    console.log(`typedoc-frontmatter: processed ${files.length} files`);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
