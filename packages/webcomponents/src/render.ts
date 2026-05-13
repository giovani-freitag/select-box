export interface SelectBoxShadowRefs {
    readonly trigger: HTMLButtonElement;
    readonly value: HTMLSpanElement;
    readonly caret: HTMLSpanElement;
    readonly popover: HTMLDivElement;
    readonly search: HTMLInputElement;
    readonly list: HTMLDivElement;
}

/**
 * Builds the static Shadow DOM scaffolding for `<select-box>` and returns the painted node refs.
 */
export function renderSelectBoxShadow(shadowRoot: ShadowRoot): SelectBoxShadowRefs {
    shadowRoot.innerHTML = SHADOW_TEMPLATE;
    return {
        trigger: shadowRoot.querySelector<HTMLButtonElement>(".trigger")!,
        value: shadowRoot.querySelector<HTMLSpanElement>(".value")!,
        caret: shadowRoot.querySelector<HTMLSpanElement>(".caret")!,
        popover: shadowRoot.querySelector<HTMLDivElement>(".popover")!,
        search: shadowRoot.querySelector<HTMLInputElement>(".search")!,
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

        /* Spacing scale */
        --sb-space-xs: 0.25rem;
        --sb-space-sm: 0.5rem;
        --sb-space-md: 0.875rem;
        --sb-space-lg: 1rem;

        /* Misc */
        --sb-radius: 8px;
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
        all: unset;
        display: inline-flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        box-sizing: border-box;
        padding: var(--sb-space-sm) var(--sb-space-md);
        background: var(--sb-color-surface);
        color: var(--sb-color-text-primary);
        border: 1px solid var(--sb-color-border);
        border-radius: var(--sb-radius);
        font: inherit;
        cursor: pointer;
        transition: border-color 0.15s ease;
    }

    .trigger:hover {
        border-color: var(--sb-color-text-primary);
    }

    .value {
        flex: 1;
        text-align: left;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .value.placeholder {
        color: var(--sb-color-text-secondary);
    }

    .caret {
        margin-left: var(--sb-space-sm);
        color: var(--sb-color-text-secondary);
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

    .search {
        display: block;
        width: 100%;
        box-sizing: border-box;
        padding: var(--sb-space-sm) var(--sb-space-md);
        background: transparent;
        color: var(--sb-color-text-primary);
        border: none;
        border-bottom: 1px solid var(--sb-color-border);
        font: inherit;
        outline: none;
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
        display: block;
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

    .empty {
        margin: 0;
        padding: var(--sb-space-lg);
        text-align: center;
        color: var(--sb-color-text-secondary);
    }
</style>
<button type="button" class="trigger" part="trigger" data-select-trigger aria-haspopup="listbox" aria-expanded="false">
    <span class="value" part="value"></span>
    <span class="caret" part="caret" aria-hidden="true">&#9662;</span>
</button>
<div class="popover" part="popover" role="listbox" data-select-popover hidden>
    <input class="search" part="search" type="text" data-select-search />
    <div class="list" part="list" data-select-list></div>
</div>
`;
