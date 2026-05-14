import {
    SelectBoxSnapshotView,
    TextHighlighter,
    type SearchMatchRange,
    type SelectBoxController,
    type SelectBoxSnapshot,
    type SelectionValue,
} from "@select-box/core";
import { useMemo, type JSX, type MouseEvent } from "react";

import { useSelectBoxVirtualizer } from "./hooks.js";

const ESTIMATED_OPTION_HEIGHT = 36;
const ESTIMATED_HEADER_HEIGHT = 28;
const LIST_VIEWPORT_HEIGHT = 240;

export interface SelectPopoverProps<TExtra extends object, TValue extends SelectionValue> {
    readonly mode: "single" | "multi";
    readonly state: SelectBoxSnapshot<TExtra, TValue>;
    readonly controller: SelectBoxController<TExtra, TValue>;
    /** Called after a successful commit. Single passes nothing; multi uses it to refocus the input. */
    readonly onAfterCommit: (() => void) | undefined;
}

/**
 * Popover with virtualized option list. Shared between single- and multi-mode
 * variants — the only mode-specific bits are the tick column and the
 * "selected" class, both gated by the `mode` prop.
 */
export function SelectPopover<TExtra extends object, TValue extends SelectionValue>({
    mode,
    state,
    controller,
    onAfterCommit,
}: SelectPopoverProps<TExtra, TValue>): JSX.Element {
    if (state.isEmpty) {
        return (
            <div
                className="select-box-popover"
                role="listbox"
                aria-multiselectable={mode === "multi" ? true : undefined}
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
            aria-multiselectable={mode === "multi" ? true : undefined}
            data-select-popover
        >
            <VirtualizedOptionList
                mode={mode}
                state={state}
                controller={controller}
                onAfterCommit={onAfterCommit}
            />
        </div>
    );
}

function VirtualizedOptionList<TExtra extends object, TValue extends SelectionValue>({
    mode,
    state,
    controller,
    onAfterCommit,
}: {
    readonly mode: "single" | "multi";
    readonly state: SelectBoxSnapshot<TExtra, TValue>;
    readonly controller: SelectBoxController<TExtra, TValue>;
    readonly onAfterCommit: (() => void) | undefined;
}): JSX.Element {
    const view = useMemo(() => new SelectBoxSnapshotView<TExtra, TValue>(state), [state]);
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
                        selected && mode === "multi" ? "select-box-option-selected" : null,
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
                            {mode === "multi" ? (
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

