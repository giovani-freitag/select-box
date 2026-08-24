import type { Locator, Page } from "@playwright/test";

export interface ScenarioQuery {
    readonly multi?: boolean;
    readonly surface?: "popover" | "inline";
    readonly count?: number;
    readonly groups?: boolean;
    readonly disabled?: boolean;
    readonly name?: string;
    readonly required?: boolean;
    /** Preselection to build the control with; a comma-separated list in multi mode. */
    readonly value?: string;
}

/**
 * Page object over the `data-select-*` contract.
 *
 * Every locator addresses the contract rather than a class name or a framework
 * internal, which is what lets one spec set drive all five wrappers.
 */
export class SelectBoxPage {
    private readonly page: Page;
    private readonly framework: string;

    constructor(page: Page, framework: string) {
        this.page = page;
        this.framework = framework;
    }

    /**
     * Loads this framework's fixture with the given scenario.
     *
     * @param scenario - Query knobs the fixture reads to build its options.
     */
    async open(scenario: ScenarioQuery = {}): Promise<void> {
        const params = new URLSearchParams();
        if (scenario.multi === true) params.set("multi", "1");
        if (scenario.surface !== undefined) params.set("surface", scenario.surface);
        if (scenario.count !== undefined) params.set("count", String(scenario.count));
        if (scenario.groups === true) params.set("groups", "1");
        if (scenario.disabled === true) params.set("disabled", "1");
        if (scenario.name !== undefined) params.set("name", scenario.name);
        if (scenario.required === true) params.set("required", "1");
        if (scenario.value !== undefined) params.set("value", scenario.value);
        const query = params.toString();
        await this.page.goto(`/${this.framework}.html${query === "" ? "" : `?${query}`}`);
        await this.root.waitFor();
    }

    get root(): Locator {
        return this.page.locator("[data-select-root]");
    }

    get trigger(): Locator {
        return this.page.locator("[data-select-trigger]");
    }

    get input(): Locator {
        return this.page.locator("[data-select-input]");
    }

    get caret(): Locator {
        return this.page.locator("[data-select-caret]");
    }

    get clear(): Locator {
        return this.page.locator("[data-select-clear]");
    }

    get popover(): Locator {
        return this.page.locator("[data-select-popover]");
    }

    get list(): Locator {
        return this.page.locator("[data-select-list]");
    }

    get options(): Locator {
        return this.page.locator("[data-select-option]");
    }

    get activeOption(): Locator {
        return this.page.locator("[data-select-active]");
    }

    get chips(): Locator {
        return this.page.locator("[data-select-chip]");
    }

    get chipRemoveButtons(): Locator {
        return this.page.locator("[data-select-chip-remove]");
    }

    get groupLabels(): Locator {
        return this.page.locator("[data-select-group-label]");
    }

    get inlineSurface(): Locator {
        return this.page.locator("[data-select-surface='inline']");
    }

    get lastChange(): Locator {
        return this.page.locator("#last-change");
    }

    /** Opens the popover the way a user does, then waits for it to settle. */
    async openPopover(): Promise<void> {
        await this.input.focus();
        await this.popover.waitFor({ state: "visible" });
    }

    async type(text: string): Promise<void> {
        await this.input.fill(text);
    }

    async pressKey(key: string): Promise<void> {
        await this.input.press(key);
    }

    async optionLabels(): Promise<ReadonlyArray<string>> {
        return (await this.options.allInnerTexts()).map((text) => text.trim());
    }

    async chipLabels(): Promise<ReadonlyArray<string>> {
        return (await this.chips.allInnerTexts()).map((text) => text.replace("×", "").trim());
    }

    async destroy(): Promise<void> {
        await this.page.locator("#destroy").click();
    }

    async toggleSurface(): Promise<void> {
        await this.page.locator("#toggle-surface").click();
    }
}
