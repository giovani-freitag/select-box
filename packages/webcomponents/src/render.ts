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
    :host {
        display: inline-block;
        position: relative;
        font: inherit;
    }
    .trigger {
        all: unset;
        display: inline-flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        cursor: pointer;
        box-sizing: border-box;
    }
    .value.placeholder {
        opacity: 0.6;
    }
    .caret {
        margin-left: 0.5rem;
        opacity: 0.7;
    }
    .popover {
        position: absolute;
        left: 0;
        right: 0;
        top: calc(100% + 0.25rem);
        z-index: 10;
        background: inherit;
        color: inherit;
    }
    .popover[hidden] {
        display: none;
    }
    .search {
        display: block;
        width: 100%;
        box-sizing: border-box;
        font: inherit;
        background: transparent;
        color: inherit;
        border: none;
        outline: none;
    }
    .list {
        max-height: 280px;
        overflow-y: auto;
    }
    .group-label {
        position: sticky;
        top: 0;
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        opacity: 0.7;
    }
    .option {
        all: unset;
        display: block;
        width: 100%;
        box-sizing: border-box;
        cursor: pointer;
    }
    .option.active {
        background: Highlight;
        color: HighlightText;
    }
    .option.disabled {
        opacity: 0.4;
        cursor: not-allowed;
    }
    .empty {
        text-align: center;
        opacity: 0.6;
        margin: 0;
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
