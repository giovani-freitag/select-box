/** The wrapper columns the E2E matrix can run, in matrix order. */
export const FRAMEWORKS = [
    "react",
    "vue",
    "lit",
    "webcomponents",
    "jquery",
] as const;

export type Framework = (typeof FRAMEWORKS)[number];

/** Which matrix column each wrapper package owns. */
const OWNED_BY: ReadonlyArray<readonly [string, Framework]> = [
    ["packages/react/", "react"],
    ["packages/vue/", "vue"],
    ["packages/lit/", "lit"],
    ["packages/webcomponents/", "webcomponents"],
    ["packages/jquery/", "jquery"],
];

/**
 * Paths that can break any wrapper, so a change here runs every column.
 *
 * The addon packages are in because an addon ships behaviour every wrapper
 * passes through its own door, and the parity suite asserts it in all five.
 */
const SHARED_PREFIXES: ReadonlyArray<string> = [
    "packages/core/",
    "packages/dom/",
    "packages/styles/",
    "packages/addon-",
    "tooling/",
    "e2e/",
    ".github/",
    "pnpm-lock.yaml",
    "pnpm-workspace.yaml",
    "turbo.json",
];

/** Paths whose change can break a demo on the docs site. */
const DOCS_PREFIXES: ReadonlyArray<string> = [
    "docs-starlight/",
    "packages/",
    "tooling/",
    "pnpm-lock.yaml",
];

/** What the workflow has to run for a given change. */
export interface E2eScope {
    /** Matrix columns to run; empty means the E2E job is skipped entirely. */
    readonly frameworks: ReadonlyArray<Framework>;
    /** Whether the docs-demo guard has to run. */
    readonly docs: boolean;
}

/** Sentinel a caller passes when it cannot compute a diff and must assume the worst. */
export const EVERYTHING = "__all__";

/**
 * Decides which E2E columns a change has to run.
 *
 * A change confined to one wrapper runs only that wrapper's column, which is
 * what keeps a one-line fix from paying for five browser runs. Anything shared
 * runs the whole matrix, and an unknown change is treated as shared.
 *
 * @param changedFiles - Repo-relative paths, or `EVERYTHING` when unknown.
 * @returns The columns to run and whether the docs guard is needed.
 */
export function resolveE2eScope(
    changedFiles: ReadonlyArray<string> | typeof EVERYTHING,
): E2eScope {
    if (changedFiles === EVERYTHING) {
        return { frameworks: FRAMEWORKS, docs: true };
    }
    const files = changedFiles.filter((file) => file !== "");
    if (files.length === 0) return { frameworks: FRAMEWORKS, docs: true };

    const docs = files.some((file) =>
        DOCS_PREFIXES.some((prefix) => file.startsWith(prefix)),
    );

    if (files.some((file) => SHARED_PREFIXES.some((prefix) => file.startsWith(prefix)))) {
        return { frameworks: FRAMEWORKS, docs };
    }

    const owned = new Set<Framework>();
    for (const file of files) {
        for (const [prefix, framework] of OWNED_BY) {
            if (file.startsWith(prefix)) owned.add(framework);
        }
    }
    return { frameworks: FRAMEWORKS.filter((name) => owned.has(name)), docs };
}
