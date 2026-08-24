import { describe, expect, test } from "vitest";

import { EVERYTHING, FRAMEWORKS, resolveE2eScope } from "../src/e2e-scope.js";

describe("resolveE2eScope", () => {
    test("runs only the column a wrapper change owns", () => {
        expect(resolveE2eScope(["packages/jquery/src/plugin.ts"]).frameworks).toEqual([
            "jquery",
        ]);
    });

    test("runs one column per wrapper touched", () => {
        expect(
            resolveE2eScope([
                "packages/react/src/SelectBox.tsx",
                "packages/vue/src/SelectBox.vue",
            ]).frameworks,
        ).toEqual(["react", "vue"]);
    });

    test("keeps the matrix order rather than the order files arrived in", () => {
        expect(
            resolveE2eScope([
                "packages/jquery/src/a.ts",
                "packages/react/src/b.tsx",
            ]).frameworks,
        ).toEqual(["react", "jquery"]);
    });

    test.each([
        "packages/core/src/controllers/select-box-controller.ts",
        "packages/dom/src/select-box-node-factory.ts",
        "packages/styles/select-box.css",
        "packages/addon-fuzzy/src/index.ts",
        "tooling/parity/src/suite.ts",
        "e2e/specs/form.spec.ts",
        "pnpm-lock.yaml",
        "pnpm-workspace.yaml",
        "turbo.json",
        ".github/workflows/ci.yml",
    ])("runs every column when %s changes", (file) => {
        expect(resolveE2eScope([file]).frameworks).toEqual([...FRAMEWORKS]);
    });

    test("a shared change outweighs a wrapper-only one in the same push", () => {
        expect(
            resolveE2eScope([
                "packages/jquery/src/plugin.ts",
                "packages/core/src/types.ts",
            ]).frameworks,
        ).toEqual([...FRAMEWORKS]);
    });

    test("skips the matrix entirely for a change no column owns", () => {
        expect(resolveE2eScope(["README.md", "PROJECT.md"]).frameworks).toEqual([]);
    });

    test("assumes the worst when the diff could not be computed", () => {
        expect(resolveE2eScope(EVERYTHING).frameworks).toEqual([...FRAMEWORKS]);
        expect(resolveE2eScope(EVERYTHING).docs).toBe(true);
    });

    test("assumes the worst for an empty file list, which means an unknown diff", () => {
        expect(resolveE2eScope([]).frameworks).toEqual([...FRAMEWORKS]);
    });

    test("ignores the empty strings a shell split leaves behind", () => {
        expect(resolveE2eScope(["", "packages/lit/src/SelectBox.ts", ""]).frameworks).toEqual([
            "lit",
        ]);
    });

    test("a docs-only change runs the demo guard and no wrapper column", () => {
        const scope = resolveE2eScope(["docs-starlight/src/components/demos/simple/Demo.astro"]);

        expect(scope.docs).toBe(true);
        expect(scope.frameworks).toEqual([]);
    });

    test("a wrapper change runs the demo guard too, since demos consume it", () => {
        expect(resolveE2eScope(["packages/vue/src/SelectBox.vue"]).docs).toBe(true);
    });

    test("a prose-only change runs neither", () => {
        const scope = resolveE2eScope(["README.md"]);

        expect(scope.docs).toBe(false);
        expect(scope.frameworks).toEqual([]);
    });

    test("does not mistake a lookalike path for a wrapper package", () => {
        expect(resolveE2eScope(["packages/reactive-thing/src/a.ts"]).frameworks).toEqual([]);
    });
});
