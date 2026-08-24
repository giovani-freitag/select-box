/**
 * Prints the E2E scope for the workflow to consume.
 *
 * Reads the changed paths from `CHANGED` (whitespace-separated, or the
 * `__all__` sentinel) and appends `frameworks` / `docs` to `GITHUB_OUTPUT`,
 * falling back to stdout when run by hand.
 */
import { appendFileSync } from "node:fs";

import { EVERYTHING, resolveE2eScope } from "../src/e2e-scope.js";

const raw = (process.env["CHANGED"] ?? "").trim();
const scope = resolveE2eScope(raw === EVERYTHING ? EVERYTHING : raw.split(/\s+/));
const lines = [
    `frameworks=${JSON.stringify(scope.frameworks)}`,
    `docs=${String(scope.docs)}`,
];

const output = process.env["GITHUB_OUTPUT"];
if (output === undefined) console.log(lines.join("\n"));
else appendFileSync(output, `${lines.join("\n")}\n`);
