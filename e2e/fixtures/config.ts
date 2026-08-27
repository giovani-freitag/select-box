/**
 * Scenario configuration every fixture reads from the URL.
 *
 * One page per framework serves every spec: the specs vary the query string
 * instead of the suite needing a fixture per case.
 */

export interface FixtureOption {
    readonly value: string;
    readonly label: string;
    readonly disabled?: boolean;
    readonly group?: string;
}

export interface FixtureConfig {
    readonly options: ReadonlyArray<FixtureOption>;
    readonly multiple: boolean;
    readonly surface: "popover" | "inline";
    readonly placeholder: string;
    /** Submitted field name. Empty means the control stays out of the form data. */
    readonly name: string;
    readonly required: boolean;
    /**
     * Preselection the control is built with, which a form reset restores the
     * way a native control returns to its default. Undefined means none.
     */
    readonly defaultValue: string | ReadonlyArray<string> | undefined;
    /** Accessible name a consumer put on the box, if any. */
    readonly ariaLabel: string | undefined;
}

const FRUITS: ReadonlyArray<FixtureOption> = [
    { value: "apple", label: "Apple" },
    { value: "pear", label: "Pear" },
    { value: "grape", label: "Grape" },
    { value: "peach", label: "Peach" },
    { value: "lemon", label: "Lemon" },
];

const GROUPS = ["Pomes", "Stone fruits", "Citrus"];

function buildOptions(params: URLSearchParams): ReadonlyArray<FixtureOption> {
    const count = Number(params.get("count") ?? "0");
    const grouped = params.get("groups") === "1";
    const withDisabled = params.get("disabled") === "1";

    // A generated list is the only way to exercise virtualization; the small
    // fruit list keeps every other spec readable.
    const base: ReadonlyArray<FixtureOption> =
        count > 0
            ? Array.from({ length: count }, (_unused, index) => ({
                  value: `option-${index}`,
                  label: `Option ${index}`,
              }))
            : FRUITS;

    return base.map((option, index) => ({
        ...option,
        ...(grouped ? { group: GROUPS[index % GROUPS.length]! } : {}),
        ...(withDisabled && index === 1 ? { disabled: true } : {}),
    }));
}

function readInitialValue(
    params: URLSearchParams,
): string | ReadonlyArray<string> | undefined {
    const raw = params.get("value");
    if (raw === null || raw === "") return undefined;
    return params.get("multi") === "1" ? raw.split(",") : raw;
}

export function readFixtureConfig(): FixtureConfig {
    const params = new URLSearchParams(window.location.search);
    return {
        options: buildOptions(params),
        multiple: params.get("multi") === "1",
        surface: params.get("surface") === "inline" ? "inline" : "popover",
        placeholder: params.get("placeholder") ?? "Pick a fruit",
        name: params.get("name") ?? "",
        required: params.get("required") === "1",
        defaultValue: readInitialValue(params),
        ariaLabel: params.get("label") ?? undefined,
    };
}

/**
 * Wires the fixture's shared controls.
 *
 * Every fixture offers the same two buttons so the lifecycle specs read the
 * same across the matrix: one tears the instance down, one flips the surface
 * at runtime.
 *
 * @param handlers - What this framework does for each control.
 */
export function wireControls(handlers: {
    readonly destroy: () => void;
    readonly toggleSurface: () => void;
}): void {
    document.querySelector("#destroy")!.addEventListener("click", handlers.destroy);
    document.querySelector("#toggle-surface")!.addEventListener("click", handlers.toggleSurface);
}
