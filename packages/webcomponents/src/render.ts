export interface SelectBoxRefs {
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
 * Builds the static scaffolding inside `<select-box>` and returns the painted
 * node refs.
 *
 * One layout serves both modes and both surfaces; paint flags whatever does not
 * apply with `hidden`. Chips are appended into `tagsContainer` at paint time in
 * multi mode.
 *
 * @param host - Element the markup renders into, which is also the root.
 * @returns Refs to every node paint needs to touch.
 */
export function renderSelectBox(host: HTMLElement): SelectBoxRefs {
    host.innerHTML = TEMPLATE;
    // Refs come from the `data-select-*` contract rather than class names, so
    // restyling the markup cannot silently break them.
    return {
        trigger: host.querySelector<HTMLDivElement>("[data-select-trigger]")!,
        tagsContainer: host.querySelector<HTMLDivElement>("[data-select-tags]")!,
        input: host.querySelector<HTMLInputElement>("[data-select-input]")!,
        caret: host.querySelector<HTMLButtonElement>("[data-select-caret]")!,
        clearButton: host.querySelector<HTMLButtonElement>("[data-select-clear]")!,
        popover: host.querySelector<HTMLDivElement>("[data-select-popover]")!,
        list: host.querySelector<HTMLDivElement>("[data-select-list]")!,
        inline: host.querySelector<HTMLDivElement>("[data-select-surface='inline']")!,
    };
}

const TEMPLATE = `
<div class="select-box-trigger" data-select-trigger>
    <div class="select-box-tags" data-select-tags>
        <input
            class="select-box-input"
            type="text"
            role="combobox"
            aria-haspopup="listbox"
            aria-autocomplete="list"
            aria-expanded="false"
            data-select-input
        />
    </div>
    <button class="select-box-caret" type="button" tabindex="-1" aria-hidden="true" data-select-caret>&#9662;</button>
    <button class="select-box-clear" type="button" tabindex="-1" aria-label="Clear all" data-select-clear hidden>&#215;</button>
</div>
<div class="select-box-popover" role="listbox" data-select-popover hidden>
    <div class="select-box-list" data-select-list></div>
</div>
<div class="select-box-inline" role="listbox" data-select-surface="inline" hidden></div>
`;
