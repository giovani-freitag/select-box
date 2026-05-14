export interface SelectBoxShadowRefs {
    readonly trigger: HTMLDivElement;
    readonly tagsContainer: HTMLDivElement;
    readonly input: HTMLInputElement;
    readonly caret: HTMLButtonElement;
    readonly clearButton: HTMLButtonElement;
    readonly popover: HTMLDivElement;
    readonly list: HTMLDivElement;
    readonly inline: HTMLDivElement;
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
        inline: shadowRoot.querySelector<HTMLDivElement>(".inline")!,
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
        min-height: 38px;
        box-sizing: border-box;
        padding: var(--sb-space-xs);
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
        box-sizing: border-box;
        height: 28px;
        padding: 0 0.6rem;
        line-height: 1;
        border: none;
        background: transparent;
        color: inherit;
        font: inherit;
        outline: none;
    }

    :host([mode="multi"]) .input {
        flex: 1;
        min-width: 5rem;
    }

    .input::placeholder {
        color: var(--sb-color-text-secondary);
    }

    /* Caret + clear share the trailing-button family with .chip-remove:
     * 28px tall, subtle border-left divider, symbol loose inside its own
     * padding. Mirrors the docs-starlight light-DOM design. */
    .caret,
    .clear {
        all: unset;
        flex-shrink: 0;
        box-sizing: border-box;
        min-height: 28px;
        align-self: center;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        margin-left: var(--sb-space-xs);
        padding: 0 0.5rem;
        border-left: 1px solid var(--sb-color-border);
        border-radius: 4px;
        color: var(--sb-color-text-secondary);
        line-height: 1;
        cursor: pointer;
        transition: background-color 0.12s ease, color 0.12s ease;
    }

    .caret:hover,
    .clear:hover {
        color: var(--sb-color-text-primary);
        background: var(--sb-color-surface-hover);
    }

    :host([mode="multi"]) .caret {
        display: none;
    }

    :host(:not([mode="multi"])) .clear,
    .clear[hidden] {
        display: none;
    }

    .chip {
        box-sizing: border-box;
        min-height: 28px;
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        padding: 0 0 0 0.6rem;
        font-size: 0.85em;
        line-height: 1;
        max-width: 100%;
        background: var(--sb-color-chip-bg);
        color: var(--sb-color-text-primary);
        border: 1px solid var(--sb-color-chip-border);
        border-radius: var(--sb-radius-chip);
        white-space: nowrap;
        overflow: hidden;
    }

    /* Flat remove affordance: × sits loose inside its button area with a
     * subtle vertical divider separating it from the chip's label. No circle. */
    .chip-remove {
        all: unset;
        align-self: stretch;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0 0.5rem;
        border-left: 1px solid var(--sb-color-chip-border);
        border-radius: 0 3px 3px 0;
        color: var(--sb-color-text-secondary);
        font-size: 1.05em;
        line-height: 1;
        cursor: pointer;
        transition: background-color 0.12s ease, color 0.12s ease;
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

    /* Group header and option share the trigger's horizontal inset (0.6rem)
     * and a pinned line-height so the parent line-height can't inflate them
     * past the virtualizer's estimated row heights. */
    .group-label {
        position: sticky;
        top: 0;
        padding: 0.5rem 0.6rem 0.25rem;
        background: var(--sb-color-surface);
        color: var(--sb-color-text-secondary);
        font-size: var(--sb-font-size-small);
        line-height: 1;
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
        padding: 0.3rem 0.6rem;
        line-height: 1.2;
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
        padding: 0.75rem 0.6rem;
        text-align: center;
        line-height: 1.4;
        color: var(--sb-color-text-secondary);
    }

    /* Inline surface: every option rendered as a toggleable chip. Mirrors the
     * docs-starlight light-DOM .select-box-inline. Hidden by default; shown
     * only when the host has [surface="inline"]. */
    .inline {
        display: none;
        width: 100%;
        min-height: 38px;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--sb-space-xs);
        padding: var(--sb-space-xs);
        box-sizing: border-box;
        border-radius: var(--sb-radius);
        border: 1px solid var(--sb-color-border);
        background: var(--sb-color-surface);
        color: var(--sb-color-text-primary);
        font: inherit;
    }

    :host([surface="inline"]) .inline {
        display: flex;
    }

    :host([surface="inline"]) .trigger,
    :host([surface="inline"]) .popover {
        display: none;
    }

    .inline-chip {
        all: unset;
        box-sizing: border-box;
        min-height: 28px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.4rem;
        padding: 0 0.6rem;
        font-size: 0.85em;
        line-height: 1;
        max-width: 100%;
        background: transparent;
        color: var(--sb-color-text-primary);
        border: 1px solid var(--sb-color-border);
        border-radius: var(--sb-radius-chip);
        white-space: nowrap;
        cursor: pointer;
        transition: background-color 0.12s ease, border-color 0.12s ease;
    }

    .inline-chip:hover:not(:disabled) {
        background: color-mix(in srgb, var(--sb-color-text-primary) 8%, transparent);
    }

    .inline-chip.selected {
        background: var(--sb-color-chip-bg);
        border-color: var(--sb-color-chip-border);
    }

    .inline-chip:disabled {
        opacity: 0.45;
        cursor: not-allowed;
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
<div class="inline" part="inline" role="listbox" data-select-surface="inline" data-select-inline></div>
`;
