import {
    SelectBoxSnapshotView,
    TextHighlighter,
    type SearchMatchRange,
    type SelectBoxKeyDispatcher,
    type SelectBoxController,
    type SelectBoxSnapshot,
    type SelectionValue,
    type SelectOption,
} from "@select-box/core";
import {
    useMemo,
    useRef,
    type ChangeEvent,
    type JSX,
    type KeyboardEvent,
    type MouseEvent,
    type RefObject,
} from "react";

import { useClickOutsideClose } from "./hooks/use-click-outside-close.js";
import { useSelectBoxKeyDispatcher } from "./hooks/use-select-box-key-dispatcher.js";
import { useSelectBoxVirtualizer } from "./hooks/use-select-box-virtualizer.js";

const ESTIMATED_OPTION_HEIGHT = 36;
const ESTIMATED_HEADER_HEIGHT = 28;
const LIST_VIEWPORT_HEIGHT = 240;

export interface PopoverSurfaceProps<TExtra extends object> {
    readonly state: SelectBoxSnapshot<TExtra, SelectionValue>;
    readonly controller: SelectBoxController<TExtra, SelectionValue>;
    readonly placeholder: string | undefined;
    readonly className: string | undefined;
    readonly ariaLabel: string | undefined;
    readonly ariaLabelledby: string | undefined;
}

/**
 * Popover-style surface: trigger (single-line input + caret in single mode;
 * chip-line input in multi mode) plus a virtualised dropdown listbox. Owns
 * click-outside-to-close and keyboard navigation — both are popover-only
 * concerns and don't apply to other surfaces.
 */
export function PopoverSurface<TExtra extends object>({
    state,
    controller,
    placeholder,
    className,
    ariaLabel,
    ariaLabelledby,
}: PopoverSurfaceProps<TExtra>): JSX.Element {
    const rootRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const keyDispatcher = useSelectBoxKeyDispatcher(controller);

    useClickOutsideClose(rootRef, state.open, controller);

    function focusInput(): void {
        inputRef.current?.focus({ preventScroll: true });
    }

    const isMulti = state.mode === "multi";
    const rootClassName = [
        "select-box",
        isMulti ? "select-box-multi" : null,
        className,
    ]
        .filter(Boolean)
        .join(" ");

    return (
        <div
            ref={rootRef}
            className={rootClassName}
            data-select-root
            data-select-mode={state.mode}
        >
            {isMulti ? (
                <MultiTrigger
                    state={state}
                    controller={controller}
                    inputRef={inputRef}
                    keyDispatcher={keyDispatcher}
                    placeholder={placeholder}
                    ariaLabel={ariaLabel}
                    ariaLabelledby={ariaLabelledby}
                    onFocusInput={focusInput}
                />
            ) : (
                <SingleTrigger
                    state={state}
                    controller={controller}
                    inputRef={inputRef}
                    keyDispatcher={keyDispatcher}
                    placeholder={placeholder}
                    ariaLabel={ariaLabel}
                    ariaLabelledby={ariaLabelledby}
                />
            )}

            {state.open ? (
                <PopoverListbox
                    state={state}
                    controller={controller}
                    onAfterCommit={isMulti ? focusInput : undefined}
                />
            ) : null}
        </div>
    );
}

/* ---------------- single trigger ---------------- */

interface SingleTriggerProps<TExtra extends object> {
    readonly state: SelectBoxSnapshot<TExtra, SelectionValue>;
    readonly controller: SelectBoxController<TExtra, SelectionValue>;
    readonly inputRef: RefObject<HTMLInputElement | null>;
    readonly keyDispatcher: SelectBoxKeyDispatcher<TExtra, SelectionValue>;
    readonly placeholder: string | undefined;
    readonly ariaLabel: string | undefined;
    readonly ariaLabelledby: string | undefined;
}

function SingleTrigger<TExtra extends object>({
    state,
    controller,
    inputRef,
    keyDispatcher,
    placeholder,
    ariaLabel,
    ariaLabelledby,
}: SingleTriggerProps<TExtra>): JSX.Element {
    const view = new SelectBoxSnapshotView(state);

    function handleInputChange(event: ChangeEvent<HTMLInputElement>): void {
        if (!state.open) controller.open();
        controller.setQuery(event.target.value);
    }

    function handleInputFocus(): void {
        if (!state.open) controller.open();
    }

    function handleInputClick(): void {
        if (!state.open) controller.open();
    }

    function handleCaretMouseDown(event: MouseEvent<HTMLButtonElement>): void {
        event.preventDefault();
    }

    function handleCaretClick(): void {
        if (state.open) {
            controller.close();
        } else {
            controller.open();
            inputRef.current?.focus({ preventScroll: true });
        }
    }

    function handleKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
        if (keyDispatcher.dispatch(event.key) === "handled") event.preventDefault();
    }

    const placeholderText = state.open && state.selectedOption
        ? state.selectedOption.label
        : (placeholder ?? "Select…");

    return (
        <div className="select-box-trigger" data-select-trigger>
            <input
                ref={inputRef}
                type="text"
                className="select-box-input"
                role="combobox"
                aria-haspopup="listbox"
                aria-expanded={state.open}
                aria-autocomplete="list"
                aria-label={ariaLabel}
                aria-labelledby={ariaLabelledby}
                placeholder={placeholderText}
                value={view.triggerInputValue}
                onChange={handleInputChange}
                onFocus={handleInputFocus}
                onClick={handleInputClick}
                onKeyDown={handleKeyDown}
                data-select-input
            />
            <button
                type="button"
                className="select-box-caret"
                onMouseDown={handleCaretMouseDown}
                onClick={handleCaretClick}
                tabIndex={-1}
                aria-hidden
            >
                ▾
            </button>
        </div>
    );
}

/* ---------------- multi trigger ---------------- */

interface MultiTriggerProps<TExtra extends object> {
    readonly state: SelectBoxSnapshot<TExtra, SelectionValue>;
    readonly controller: SelectBoxController<TExtra, SelectionValue>;
    readonly inputRef: RefObject<HTMLInputElement | null>;
    readonly keyDispatcher: SelectBoxKeyDispatcher<TExtra, SelectionValue>;
    readonly placeholder: string | undefined;
    readonly ariaLabel: string | undefined;
    readonly ariaLabelledby: string | undefined;
    readonly onFocusInput: () => void;
}

function MultiTrigger<TExtra extends object>({
    state,
    controller,
    inputRef,
    keyDispatcher,
    placeholder,
    ariaLabel,
    ariaLabelledby,
    onFocusInput,
}: MultiTriggerProps<TExtra>): JSX.Element {
    function handleControlMouseDown(event: MouseEvent<HTMLDivElement>): void {
        if (event.target !== inputRef.current) event.preventDefault();
        if (!state.open) controller.open();
        onFocusInput();
    }

    function handleInputChange(event: ChangeEvent<HTMLInputElement>): void {
        if (!state.open) controller.open();
        controller.setQuery(event.target.value);
    }

    function handleInputFocus(): void {
        if (!state.open) controller.open();
    }

    function handleKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
        if (keyDispatcher.dispatch(event.key) === "handled") event.preventDefault();
    }

    function handleChipRemove(
        option: SelectOption<TExtra>,
        event: MouseEvent<HTMLButtonElement>,
    ): void {
        event.stopPropagation();
        controller.commitOption(option);
        onFocusInput();
    }

    function handleClearAll(event: MouseEvent<HTMLButtonElement>): void {
        event.stopPropagation();
        controller.clear();
        onFocusInput();
    }

    const hasSelection = state.selectedOptions.length > 0;
    const placeholderText = hasSelection ? "" : (placeholder ?? "Select…");

    return (
        <div
            className="select-box-trigger"
            data-select-trigger
            role="combobox"
            aria-expanded={state.open}
            aria-haspopup="listbox"
            aria-label={ariaLabel}
            aria-labelledby={ariaLabelledby}
            onMouseDown={handleControlMouseDown}
        >
            <div className="select-box-tags" data-select-tags>
                {state.selectedOptions.map((option) => (
                    <span key={option.value} className="select-box-chip" data-select-chip>
                        {option.label}
                        <button
                            type="button"
                            className="select-box-chip-remove"
                            aria-label={`Remove ${option.label}`}
                            onMouseDown={(event) => event.stopPropagation()}
                            onClick={(event) => handleChipRemove(option, event)}
                        >
                            ×
                        </button>
                    </span>
                ))}
                <input
                    ref={inputRef}
                    type="text"
                    className="select-box-input"
                    role="searchbox"
                    aria-autocomplete="list"
                    placeholder={placeholderText}
                    value={state.query}
                    onChange={handleInputChange}
                    onFocus={handleInputFocus}
                    onKeyDown={handleKeyDown}
                    data-select-input
                />
            </div>
            {hasSelection && (
                <button
                    type="button"
                    className="select-box-clear"
                    aria-label="Clear all"
                    tabIndex={-1}
                    onMouseDown={(event) => event.stopPropagation()}
                    onClick={handleClearAll}
                    data-select-clear
                >
                    ×
                </button>
            )}
        </div>
    );
}

/* ---------------- popover listbox ---------------- */

interface PopoverListboxProps<TExtra extends object> {
    readonly state: SelectBoxSnapshot<TExtra, SelectionValue>;
    readonly controller: SelectBoxController<TExtra, SelectionValue>;
    readonly onAfterCommit: (() => void) | undefined;
}

function PopoverListbox<TExtra extends object>({
    state,
    controller,
    onAfterCommit,
}: PopoverListboxProps<TExtra>): JSX.Element {
    const isMulti = state.mode === "multi";
    if (state.isEmpty) {
        return (
            <div
                className="select-box-popover"
                role="listbox"
                aria-multiselectable={isMulti ? true : undefined}
                data-select-popover
            >
                <div className="select-box-list" data-select-list>
                    <p className="select-box-empty" data-select-empty>
                        No matches
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div
            className="select-box-popover"
            role="listbox"
            aria-multiselectable={isMulti ? true : undefined}
            data-select-popover
        >
            <VirtualizedOptionList
                state={state}
                controller={controller}
                onAfterCommit={onAfterCommit}
            />
        </div>
    );
}

function VirtualizedOptionList<TExtra extends object>({
    state,
    controller,
    onAfterCommit,
}: PopoverListboxProps<TExtra>): JSX.Element {
    const isMulti = state.mode === "multi";
    const view = useMemo(() => new SelectBoxSnapshotView<TExtra, SelectionValue>(state), [state]);
    const {
        listRef,
        rowModel,
        virtualItems,
        paddingTop,
        paddingBottom,
        activeRowIndex,
        measureElement,
    } = useSelectBoxVirtualizer<TExtra>({
        groups: state.filteredGroups,
        activeIndex: state.activeIndex,
        viewportHeight: LIST_VIEWPORT_HEIGHT,
        estimateHeader: ESTIMATED_HEADER_HEIGHT,
        estimateOption: ESTIMATED_OPTION_HEIGHT,
    });

    function handleOptionMouseDown(event: MouseEvent<HTMLButtonElement>): void {
        event.preventDefault();
    }

    return (
        <div
            ref={listRef}
            className="select-box-list"
            data-select-list
            style={{ maxHeight: LIST_VIEWPORT_HEIGHT, overflowY: "auto" }}
        >
            <div style={{ paddingTop, paddingBottom }}>
                {virtualItems.map((virtualRow) => {
                    const row = rowModel.getRowAt(virtualRow.index);
                    if (!row) return null;
                    const measureRef = (node: HTMLElement | null): void => measureElement(node);
                    if (row.kind === "header") {
                        return (
                            <div
                                key={`header-${row.groupIndex}`}
                                ref={measureRef}
                                data-index={virtualRow.index}
                                className="select-box-group-label"
                                data-select-group-label
                            >
                                {row.group.label}
                            </div>
                        );
                    }
                    const isActive = virtualRow.index === activeRowIndex;
                    const selected = view.isSelected(row.option.value);
                    const classes = [
                        "select-box-option",
                        isActive ? "select-box-option-active" : null,
                        selected && isMulti ? "select-box-option-selected" : null,
                        row.option.disabled ? "select-box-option-disabled" : null,
                    ]
                        .filter(Boolean)
                        .join(" ");
                    return (
                        <button
                            key={row.option.value}
                            ref={measureRef}
                            data-index={virtualRow.index}
                            type="button"
                            role="option"
                            aria-selected={selected}
                            className={classes}
                            disabled={row.option.disabled}
                            onMouseDown={handleOptionMouseDown}
                            onClick={() => {
                                controller.commitOption(row.option);
                                onAfterCommit?.();
                            }}
                            data-select-option
                            data-select-active={isActive ? "" : undefined}
                            data-select-selected={selected ? "" : undefined}
                        >
                            {isMulti ? (
                                <span className="select-box-option-tick" aria-hidden>
                                    {selected ? "✓" : ""}
                                </span>
                            ) : null}
                            <HighlightedLabel
                                label={row.option.label}
                                highlightRanges={state.highlightRanges}
                            />
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

function HighlightedLabel(props: {
    readonly label: string;
    readonly highlightRanges: (label: string) => ReadonlyArray<SearchMatchRange>;
}): JSX.Element {
    const chunks = TextHighlighter.split(props.label, props.highlightRanges(props.label));
    return (
        <>
            {chunks.map((chunk, index) =>
                chunk.matched ? (
                    <mark key={index} className="select-box-option-match">
                        {chunk.text}
                    </mark>
                ) : (
                    <span key={index}>{chunk.text}</span>
                ),
            )}
        </>
    );
}
