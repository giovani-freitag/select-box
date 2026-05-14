import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, test } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const typesSource = readFileSync(resolve(here, "../../src/types.ts"), "utf-8");
const indexSource = readFileSync(resolve(here, "../../src/index.ts"), "utf-8");

function stripBlockComments(source: string): string {
    return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

/**
 * The addon contract is the contract that third-party plugins compile against.
 * Once published, broadening it (e.g. handing addons a mutable controller
 * reference) is a permanent capability that future versions must keep
 * supporting. These tests lock the surface area so a refactor can't
 * accidentally reintroduce the previous mutation-capable `SelectBoxAddonHost`.
 */
describe("addon contract", () => {
    test("SelectBoxAddonHost is not declared in core types", () => {
        expect(typesSource).not.toMatch(/SelectBoxAddonHost/);
    });

    test("SelectBoxAddonHost is not exported from the core barrel", () => {
        expect(indexSource).not.toMatch(/SelectBoxAddonHost/);
    });

    test("SelectBoxAddon.attach takes no arguments", () => {
        const interfaceMatch = typesSource.match(
            /export interface SelectBoxAddon<[^>]+>\s*{[^}]*}/,
        );
        expect(interfaceMatch, "SelectBoxAddon interface block not found").not.toBeNull();

        const interfaceBody = interfaceMatch![0];
        expect(interfaceBody).toMatch(/attach\?\(\)\s*:\s*void/);
        expect(interfaceBody).toMatch(/detach\?\(\)\s*:\s*void/);
    });

    test("only the documented hooks live on SelectBoxAddon", () => {
        const interfaceMatch = typesSource.match(
            /export interface SelectBoxAddon<[^>]+>\s*{([\s\S]*?)\n}/,
        );
        expect(interfaceMatch, "SelectBoxAddon interface block not found").not.toBeNull();

        const memberSource = stripBlockComments(interfaceMatch![1]!);
        // Members live at 4-space indent; multi-line signature params live deeper
        // and must not be counted as members.
        const memberNames = Array.from(memberSource.matchAll(/^ {4}(?:readonly\s+)?(\w+)\??\s*[(:]/gm))
            .map((match) => match[1])
            .filter((name): name is string => name !== undefined);

        const allowed = new Set([
            "name",
            "attach",
            "detach",
            "provideFilter",
            "transformGroups",
            "extendSnapshot",
        ]);
        for (const member of memberNames) {
            expect(allowed.has(member), `Unexpected addon hook: ${member}`).toBe(true);
        }
    });

    test("SelectBoxAddon does not expose mutator methods (set*/use)", () => {
        const interfaceMatch = typesSource.match(
            /export interface SelectBoxAddon<[^>]+>\s*{([\s\S]*?)\n}/,
        );
        const memberSource = stripBlockComments(interfaceMatch![1]!);

        expect(memberSource).not.toMatch(/^ {4}set[A-Z]\w*\??\s*\(/m);
        expect(memberSource).not.toMatch(/^ {4}use\??\s*\(/m);
    });
});
