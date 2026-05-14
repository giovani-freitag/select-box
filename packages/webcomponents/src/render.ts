export interface SelectBoxShadowRefs {
    readonly trigger: HTMLDivElement;
    readonly tagsContainer: HTMLDivElement;
    readonly input: HTMLInputElement;
    readonly caret: HTMLButtonElement;
    readonly clearButton: HTMLButtonElement;
    readonly popover: HTMLDivElement;
    readonly list: HTMLDivElement;
}

/**
 * Builds the static Shadow DOM scaffolding for `<select-box>` and returns the
 * painted node refs. One layout serves both single and multi modes — CSS
 * toggles caret vs tags-container vs clear-button based on the `mode` host
 * attribute. Chips are appended into `tagsContainer` at paint time in multi.
 */
export function renderSelectBoxShadow(shadowRoot: ShadowRoot): SelectBoxShadowRefs {
    shadowRoot.innerHTML = SHADOW_TEMPLATE;
    return {
        trigger: shadowRoot.querySelector<HTMLDivElement>(".trigger")!,
        tagsContainer: shadowRoot.querySelector<HTMLDivElement>(".tags")!,
        input: shadowRoot.querySelector<HTMLInputElement>(".input")!,
        caret: shadowRoot.querySelector<HTMLButtonElement>(".caret")!,
        clearButton: shadowRoot.querySelector<HTMLButtonElement>(".clear")!,
        popover: shadowRoot.querySelector<HTMLDivElement>(".popover")!,
        list: shadowRoot.querySelector<HTMLDivElement>(".list")!,
    };
}

const SHADOW_TEMPLATE = `
<style>
    /* Design tokens — cross the shadow boundary, so consumers can theme via
     * "select-box { --sb-color-surface: ...; }" from light DOM. For structural
     * overrides that variables can't express, every element exposes a "part"
     * (::part(trigger), ::part(option), …). */
    :host {
        /* Colors (default to CSS system colors so light/dark UA preferences work out of the box) */
        --sb-color-surface: Canvas;
        --sb-color-surface-hover: color-mix(in srgb, CanvasText 6%, transparent);
        --sb-color-text-primary: CanvasText;
        --sb-color-text-secondary: GrayText;
        --sb-color-border: color-mix(in srgb, CanvasText 14%, transparent);
        --sb-color-highlight-bg: Highlight;
        --sb-color-highlight-text: HighlightText;
        --sb-color-chip-bg: color-mix(in srgb, Highlight 14%, Canvas);
        --sb-color-chip-border: color-mix(in srgb, Highlight 30%, transparent);

        /* Spacing scale */
        --sb-space-xs: 0.25rem;
        --sb-space-sm: 0.5rem;
        --sb-space-md: 0.875rem;
        --sb-space-lg: 1rem;

        /* Misc */
        --sb-radius: 8px;
        --sb-radius-chip: 4px;
        --sb-shadow-popover: 0 12px 24px -8px color-mix(in srgb, CanvasText 30%, transparent);
        --sb-font-size: inherit;
        --sb-font-size-small: 0.75em;
        --sb-list-max-height: 240px;
        --sb-popover-z-index: 30;

        display: inline-block;
        position: relative;
        font: inherit;
        color: var(--sb-color-text-primary);
    }

    .trigger {
        display: flex;
        align-items: center;
        gap: var(--sb-space-xs);
        width: 100%;
        box-sizing: border-box;
        padding: var(--sb-space-sm) var(--sb-space-md);
        background: var(--sb-color-surface);
        color: var(--sb-color-text-primary);
        border: 1px solid var(--sb-color-border);
        border-radius: var(--sb-radius);
        transition: border-color 0.15s ease;
    }

    /* Multi mode: keep the single mode's padding so a chip-less trigger has
     * the same height as the single variant. Wrap chips + input inside the
     * same row; only chip overflow grows the trigger vertically. */
    :host([mode="multi"]) .trigger {
        flex-wrap: wrap;
        cursor: text;
    }

    .trigger:hover,
    .trigger:focus-within {
        border-color: var(--sb-color-text-primary);
    }

    /* Tags container — transparent in single mode so the input sits flush
     * next to the caret; flex-wrap container in multi mode for chips + input. */
    .tags {
        display: contents;
    }

    :host([mode="multi"]) .tags {
        display: flex;
        flex: 1;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--sb-space-xs);
        min-width: 0;
    }

    .input {
        flex: 1;
        min-width: 0;
        padding: 0;
        border: none;
        background: transparent;
        color: inherit;
        font: inherit;
        outline: none;
    }

    :host([mode="multi"]) .input {
        min-width: 5rem;
        padding: 0;
    }

    .input::placeholder {
        color: var(--sb-color-text-secondary);
    }

    .caret {
        all: unset;
        margin-left: var(--sb-space-sm);
        color: var(--sb-color-text-secondary);
        cursor: pointer;
        line-height: 1;
    }

    :host([mode="multi"]) .caret {
        display: none;
    }

    .clear {
        all: unset;
        display: grid;
        place-items: center;
        margin-left: var(--sb-space-xs);
        width: 1.4em;
        height: 1.4em;
        font-size: 1.05em;
        line-height: 1;
        color: var(--sb-color-text-secondary);
        cursor: pointer;
        border-radius: 100%;
        align-self: center;
    }

    .clear:hover {
        color: var(--sb-color-text-primary);
        background: var(--sb-color-surface-hover);
    }

    :host(:not([mode="multi"])) .clear,
    .clear[hidden] {
        display: none;
    }

    .chip {
        display: inline-flex;
        align-items: center;
        gap: var(--sb-space-xs);
        padding: 0.25rem 0.15rem 0.25rem 0.55rem;
        font-size: 0.85em;
        line-height: 1;
        background: var(--sb-color-chip-bg);
        color: var(--sb-color-text-primary);
        border: 1px solid var(--sb-color-chip-border);
        border-radius: var(--sb-radius-chip);
        white-space: nowrap;
    }

    .chip-remove {
        all: unset;
        display: grid;
        place-items: center;
        width: 1.3em;
        height: 1.3em;
        font-size: 1.05em;
        line-height: 1;
        color: var(--sb-color-text-secondary);
        cursor: pointer;
        border-radius: 100%;
    }

    .chip-remove:hover {
        color: var(--sb-color-text-primary);
        background: var(--sb-color-surface-hover);
    }

    .popover {
        position: absolute;
        left: 0;
        right: 0;
        top: calc(100% + var(--sb-space-xs));
        z-index: var(--sb-popover-z-index);
        background: var(--sb-color-surface);
        color: var(--sb-color-text-primary);
        border: 1px solid var(--sb-color-border);
        border-radius: var(--sb-radius);
        box-shadow: var(--sb-shadow-popover);
        overflow: hidden;
    }

    .popover[hidden] {
        display: none;
    }

    .list {
        max-height: var(--sb-list-max-height);
        overflow-y: auto;
    }

    .group-label {
        position: sticky;
        top: 0;
        padding: var(--sb-space-sm) var(--sb-space-md) var(--sb-space-xs);
        background: var(--sb-color-surface);
        color: var(--sb-color-text-secondary);
        font-size: var(--sb-font-size-small);
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    .option {
        all: unset;
        display: flex;
        align-items: center;
        gap: var(--sb-space-sm);
        width: 100%;
        box-sizing: border-box;
        padding: var(--sb-space-sm) var(--sb-space-md);
        color: var(--sb-color-text-primary);
        font: inherit;
        cursor: pointer;
    }

    .option:hover:not(.disabled) {
        background: var(--sb-color-surface-hover);
    }

    .option.active {
        background: var(--sb-color-highlight-bg);
        color: var(--sb-color-highlight-text);
    }

    .option.disabled {
        color: var(--sb-color-text-secondary);
        opacity: 0.6;
        cursor: not-allowed;
    }

    .option-tick {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 1em;
        flex-shrink: 0;
        color: inherit;
    }

    .empty {
        margin: 0;
        padding: var(--sb-space-lg);
        text-align: center;
        color: var(--sb-color-text-secondary);
    }
</style>
<div class="trigger" part="trigger" data-select-trigger>
    <div class="tags" part="tags" data-select-tags>
        <input
            class="input"
            part="input"
            type="text"
            role="combobox"
            aria-haspopup="listbox"
            aria-autocomplete="list"
            aria-expanded="false"
            data-select-input
        />
    </div>
    <button class="caret" part="caret" type="button" tabindex="-1" aria-hidden="true" data-select-caret>&#9662;</button>
    <button class="clear" part="clear" type="button" tabindex="-1" aria-label="Clear all" data-select-clear hidden>&#215;</button>
</div>
<div class="popover" part="popover" role="listbox" data-select-popover hidden>
    <div class="list" part="list" data-select-list></div>
</div>
`;
