/**
 * Contract every wrapper implements so the shared parity suite can drive it
 * without knowing which framework rendered the DOM.
 */

export interface ParityOption {
    readonly value: string;
    readonly label: string;
    readonly group?: string;
    readonly disabled?: boolean;
}

export type ParitySurface = "popover" | "inline";

export interface ParityMountConfig {
    readonly options: ReadonlyArray<ParityOption>;
    readonly placeholder: string;
    readonly multi: boolean;
    readonly surface: ParitySurface;
    readonly disabled?: boolean;
    readonly readOnly?: boolean;
    /** Addons registered at construction, exactly as a consumer would pass them. */
    readonly addons?: ReadonlyArray<ParityAddon>;
    /** Accessible name a consumer asked for. */
    readonly ariaLabel?: string;
}

/**
 * The slice of the core controller the suite exercises.
 *
 * Structural on purpose: the suite proves the wrapper handed over the *live*
 * controller without this package depending on the core's types.
 */
export interface ParityController {
    open(): void;
    commitValue(value: string | ReadonlyArray<string> | null): void;
    getState(): {
        readonly open: boolean;
        readonly addons: Readonly<Record<string, unknown>>;
    };
}

/**
 * The addon shape, structurally.
 *
 * Declared here rather than imported so this package keeps no dependency on the
 * core, while still letting a scenario hand a real addon to every wrapper the
 * way a consumer would.
 */
export interface ParityAddon {
    readonly name: string;
    transformGroups?(
        groups: ReadonlyArray<{
            readonly key: string;
            readonly label: string;
            readonly options: ReadonlyArray<ParityOption>;
        }>,
    ): ReadonlyArray<{
        readonly key: string;
        readonly label: string;
        readonly options: ReadonlyArray<ParityOption>;
    }>;
    extendSnapshot?(): unknown;
    attach?(): void;
    detach?(): void;
}

/**
 * A mounted wrapper instance the suite interacts with.
 *
 * Every method that changes state is async so frameworks with deferred
 * rendering can flush before the suite asserts.
 */
export interface ParityHandle {
    /**
     * Node the suite searches from. Deliberately not the select box's root: it
     * is whatever contains the rendered tree — a shadow root, a host element, a
     * mount point — so `querySelector` reaches every part including the root.
     */
    queryScope(): ParentNode;
    /** Root element as the wrapper's own public API hands it over. */
    publicRoot(): Element | null;
    /** Core controller as the wrapper's own public API hands it over. */
    publicController(): ParityController | null;
    /** Resolves once the wrapper has flushed whatever is pending. */
    settle(): Promise<void>;
    /** Replaces the option list the way a consumer of this wrapper would. */
    setOptions(options: ReadonlyArray<ParityOption>): Promise<void>;
    /** Flips selection cardinality on a live instance. */
    setMulti(multi: boolean): Promise<void>;
    /** Sets the selection programmatically, through the wrapper's own door. */
    setValue(value: string | ReadonlyArray<string> | null): Promise<void>;
    /** Every value this wrapper has reported since mount. */
    reportedChanges(): ReadonlyArray<unknown>;
    focusInput(): Promise<void>;
    typeIntoInput(text: string): Promise<void>;
    clickElement(element: Element): Promise<void>;
    pressKey(key: string): Promise<void>;
    clickOutside(): Promise<void>;
    unmount(): Promise<void>;
}

export interface ParityAdapter {
    /** Framework label used in the suite's describe block. */
    readonly name: string;
    mount(config: ParityMountConfig): Promise<ParityHandle>;
}

export const PARITY_FRUITS: ReadonlyArray<ParityOption> = [
    { value: "apple", label: "Apple" },
    { value: "pear", label: "Pear" },
    { value: "grape", label: "Grape" },
];

/** Same fruits with one disabled leaf, so refusal can be asserted. */
export const PARITY_FRUITS_WITH_DISABLED: ReadonlyArray<ParityOption> = [
    { value: "apple", label: "Apple" },
    { value: "pear", label: "Pear", disabled: true },
    { value: "grape", label: "Grape" },
];

/** Same fruits carrying group keys, so wrappers must render group headers. */
export const PARITY_GROUPED_FRUITS: ReadonlyArray<ParityOption> = [
    { value: "apple", label: "Apple", group: "Pomes" },
    { value: "pear", label: "Pear", group: "Pomes" },
    { value: "grape", label: "Grape", group: "Berries" },
];

export const PARITY_PLACEHOLDER = "Pick a fruit";

/** A different list, sharing one value with `PARITY_FRUITS` so a swap can keep it. */
export const PARITY_SWAPPED_FRUITS: ReadonlyArray<ParityOption> = [
    { value: "pear", label: "Pear" },
    { value: "fig", label: "Fig" },
    { value: "date", label: "Date" },
];

interface DomHandleConfig {
    readonly queryScope: () => ParentNode;
    readonly setOptions: (options: ReadonlyArray<ParityOption>) => void;
    readonly setMulti: (multi: boolean) => void;
    readonly setValue: (value: string | ReadonlyArray<string> | null) => void;
    readonly reportedChanges: () => ReadonlyArray<unknown>;
    readonly publicRoot: () => Element | null;
    readonly publicController: () => ParityController | null;
    readonly settle: () => Promise<void>;
    readonly teardown: () => void;
}

/**
 * Builds a handle that drives the component through native DOM events.
 *
 * Wrappers whose test tooling requires its own event helpers (React) supply a
 * handle of their own instead; everything else shares this one so a behavioural
 * difference between wrappers cannot come from the way the suite typed a key.
 */
export function createDomHandle(config: DomHandleConfig): ParityHandle {
    function input(): HTMLInputElement {
        return config.queryScope().querySelector<HTMLInputElement>("[data-select-input]")!;
    }

    return {
        queryScope: config.queryScope,
        publicRoot: config.publicRoot,
        publicController: config.publicController,
        settle: config.settle,

        async setOptions(options: ReadonlyArray<ParityOption>): Promise<void> {
            config.setOptions(options);
            await config.settle();
        },

        async setMulti(multi: boolean): Promise<void> {
            config.setMulti(multi);
            await config.settle();
        },

        async setValue(value: string | ReadonlyArray<string> | null): Promise<void> {
            config.setValue(value);
            await config.settle();
        },

        reportedChanges: config.reportedChanges,

        async focusInput(): Promise<void> {
            input().focus();
            await config.settle();
        },

        async typeIntoInput(text: string): Promise<void> {
            const element = input();
            element.value = text;
            element.dispatchEvent(new Event("input", { bubbles: true }));
            await config.settle();
        },

        async clickElement(element: Element): Promise<void> {
            element.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
            element.dispatchEvent(new MouseEvent("click", { bubbles: true }));
            await config.settle();
        },

        async pressKey(key: string): Promise<void> {
            input().dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
            await config.settle();
        },

        async clickOutside(): Promise<void> {
            document.body.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
            await config.settle();
        },

        async unmount(): Promise<void> {
            config.teardown();
            await config.settle();
        },
    };
}
