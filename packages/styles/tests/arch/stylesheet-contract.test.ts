import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, test } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../../..");
const stylesheet = readFileSync(resolve(here, "../../select-box.css"), "utf-8");

const WRAPPERS = ["react", "vue", "lit", "webcomponents", "jquery"] as const;

/** Classes a wrapper renders but that exist for consumers, not for this sheet. */
const UNSTYLED_ON_PURPOSE = new Set<string>([]);

function readSourceFiles(directory: string): ReadonlyArray<string> {
    const collected: string[] = [];
    for (const entry of readdirSync(directory)) {
        const full = join(directory, entry);
        if (statSync(full).isDirectory()) {
            collected.push(...readSourceFiles(full));
            continue;
        }
        if (/\.(ts|tsx|vue)$/.test(entry)) collected.push(readFileSync(full, "utf-8"));
    }
    return collected;
}

/** Every `select-box-*` class name any wrapper puts on an element. */
function emittedClasses(): ReadonlySet<string> {
    const found = new Set<string>();
    for (const wrapper of WRAPPERS) {
        for (const source of readSourceFiles(resolve(repoRoot, "packages", wrapper, "src"))) {
            for (const match of source.matchAll(/["'`\s](select-box(?:-[a-z]+)*)["'`\s]/g)) {
                found.add(match[1]!);
            }
        }
    }
    return found;
}

/** Every class this stylesheet writes a rule for. */
function styledClasses(): ReadonlySet<string> {
    const withoutComments = stylesheet.replace(/\/\*[\s\S]*?\*\//g, "");
    const found = new Set<string>();
    for (const match of withoutComments.matchAll(/\.(select-box(?:-[a-z]+)*)/g)) {
        found.add(match[1]!);
    }
    return found;
}

/**
 * The shipped stylesheet and the markup the wrappers render have to describe the
 * same component.
 *
 * Both directions matter and both have already drifted: `select-box-option-match`
 * and `select-box-multi` were rendered by all five wrappers with no rule at all,
 * so a search highlight fell back to the browser's yellow mark. Dead selectors
 * rot the other way — they read as supported API long after nothing emits them.
 */
describe("stylesheet contract", () => {
    test("every class a wrapper renders has a rule", () => {
        const missing = [...emittedClasses()]
            .filter((name) => !styledClasses().has(name))
            .filter((name) => !UNSTYLED_ON_PURPOSE.has(name))
            .sort();

        expect(missing).toEqual([]);
    });

    test("every rule in the stylesheet has an emitter", () => {
        const emitted = emittedClasses();
        const dead = [...styledClasses()].filter((name) => !emitted.has(name)).sort();

        expect(dead).toEqual([]);
    });

    test("every declared --sb-* token is referenced somewhere in the sheet", () => {
        const declared = new Set(
            [...stylesheet.matchAll(/^\s{4}(--sb-[a-z-]+):/gm)].map((match) => match[1]!),
        );
        const referenced = new Set(
            [...stylesheet.matchAll(/var\((--sb-[a-z-]+)/g)].map((match) => match[1]!),
        );

        const inert = [...declared].filter((token) => !referenced.has(token)).sort();
        expect(inert).toEqual([]);
    });
});
