import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript";
import { describe, expect, test } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const typesPath = resolve(here, "../../src/types.ts");
const typesSource = readFileSync(typesPath, "utf-8");
const indexSource = readFileSync(resolve(here, "../../src/index.ts"), "utf-8");

/**
 * Reads one interface's members off the AST.
 *
 * Parsing rather than matching text is what makes this guard trustworthy: a
 * regex anchored on indentation returns an empty list when the file is
 * reformatted, and an empty list silently satisfies every assertion that walks
 * it.
 *
 * @param interfaceName - Interface to read.
 * @returns Its member signatures, in declaration order.
 * @throws When the interface is absent, so a rename fails loudly.
 */
function readInterfaceMembers(interfaceName: string): ReadonlyArray<ts.TypeElement> {
    const source = ts.createSourceFile(
        typesPath,
        typesSource,
        ts.ScriptTarget.ES2022,
        /* setParentNodes */ true,
    );
    let members: ReadonlyArray<ts.TypeElement> | null = null;
    source.forEachChild((node) => {
        if (ts.isInterfaceDeclaration(node) && node.name.text === interfaceName) {
            members = node.members;
        }
    });
    if (members === null) throw new Error(`interface ${interfaceName} not found in types.ts`);
    return members;
}

function memberNames(members: ReadonlyArray<ts.TypeElement>): ReadonlyArray<string> {
    return members
        .map((member) => (member.name && ts.isIdentifier(member.name) ? member.name.text : null))
        .filter((name): name is string => name !== null);
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

    test("SelectBoxAddon carries exactly the documented hooks", () => {
        const names = [...memberNames(readInterfaceMembers("SelectBoxAddon"))].sort();

        expect(names).toEqual([
            "attach",
            "detach",
            "extendSnapshot",
            "interceptClose",
            "interceptCommit",
            "interceptOpen",
            "name",
            "onKeyDown",
            "provideFilter",
            "transformGroups",
            "transformOptions",
        ]);
    });

    test("SelectBoxAddon.attach and .detach take no arguments", () => {
        const members = readInterfaceMembers("SelectBoxAddon");

        const lifecycle = members.filter(
            (member): member is ts.MethodSignature =>
                ts.isMethodSignature(member) &&
                member.name !== undefined &&
                ts.isIdentifier(member.name) &&
                ["attach", "detach"].includes(member.name.text),
        );

        expect(lifecycle).toHaveLength(2);
        expect(lifecycle.map((member) => member.parameters.length)).toEqual([0, 0]);
    });

    test("SelectBoxAddon exposes no mutator hook", () => {
        const names = memberNames(readInterfaceMembers("SelectBoxAddon"));

        expect(names.filter((name) => /^set[A-Z]/.test(name) || name === "use")).toEqual([]);
    });
});
