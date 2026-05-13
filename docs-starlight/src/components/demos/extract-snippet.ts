const REGION_PATTERNS = [
    /^[ \t]*\/\/[ \t]*#region[ \t]+snippet[ \t]*$/,
    /^[ \t]*<!--[ \t]*#region[ \t]+snippet[ \t]*-->[ \t]*$/,
] as const;

const ENDREGION_PATTERNS = [
    /^[ \t]*\/\/[ \t]*#endregion(?:[ \t]+snippet)?[ \t]*$/,
    /^[ \t]*<!--[ \t]*#endregion(?:[ \t]+snippet)?[ \t]*-->[ \t]*$/,
] as const;

function matchesAny(line: string, patterns: ReadonlyArray<RegExp>): boolean {
    return patterns.some((pattern) => pattern.test(line));
}

function dedent(block: ReadonlyArray<string>): string[] {
    const indents = block
        .filter((line) => line.trim() !== "")
        .map((line) => line.match(/^[ \t]*/)![0].length);
    const minIndent = indents.length === 0 ? 0 : Math.min(...indents);
    return block.map((line) => line.slice(minIndent));
}

/**
 * Extracts every `// #region snippet` / `<!-- #region snippet -->` block from
 * a source file and joins them with a blank line separator. Returns the file
 * verbatim when no region markers are present, so demos can opt-in gradually.
 */
export function extractSnippet(source: string): string {
    const lines = source.split("\n");
    const blocks: string[][] = [];
    let current: string[] | null = null;

    for (const line of lines) {
        if (current === null) {
            if (matchesAny(line, REGION_PATTERNS)) current = [];
            continue;
        }
        if (matchesAny(line, ENDREGION_PATTERNS)) {
            blocks.push(current);
            current = null;
            continue;
        }
        current.push(line);
    }

    if (blocks.length === 0) return source.trim();
    return blocks.map((block) => dedent(block).join("\n").trim()).join("\n\n");
}
