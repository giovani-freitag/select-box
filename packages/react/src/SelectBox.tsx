import {
    findRowIndexForActiveIndex,
    flattenGroupsForVirtualization,
    ListVirtualizer,
    type OptionFilterStrategy,
    type SelectBoxAddon,
    type SelectBoxRow,
    type SelectGroup,
    type SelectOption,
} from "@select-box/core";
import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    useSyncExternalStore,
    type JSX,
    type KeyboardEvent,
    type MouseEvent,
} from "react";

import { useSelectBox } from "./use-select-box.js";

const OPTION_ROW_HEIGHT = 36;
const HEADER_ROW_HEIGHT = 28;
const LIST_VIEWPORT_HEIGHT = 240;

export interface SelectBoxProps<TExtra extends object = object> {
    readonly options?: ReadonlyArray<SelectOption<TExtra>>;
    readonly groups?: ReadonlyArray<SelectGroup<TExtra>>;
    /** Initial value (coerced to string). The component owns the selection internally; listen via `onChange`. */
    readonly defaultValue?: string | number | null;
    /**
     * Fires whenever the committed value changes (including `clear()`).
     * Matches native `<select>` semantics: `value` is the canonical string
     * identifier; `option` is the full option object (with any extra payload).
     */
    readonly onChange?: (value: string | null, option: SelectOption<TExtra> | null) => void;
    readonly placeholder?: string;
    readonly ungroupedLabel?: string;
    readonly addons?: ReadonlyArray<SelectBoxAddon<TExtra>>;
    readonly filter?: OptionFilterStrategy<TExtra>;
    /** Extra class applied to the root element. */
    readonly className?: string;
    readonly "aria-label"?: string;
    readonly "aria-labelledby"?: string;
}

/**
 * Default single-select box component; use `useSelectBox()` directly for custom markup.
 */
export function SelectBox<TExtra extends object = object>(props: SelectBoxProps<TExtra>): JSX.Element {
    const {
        options,
        groups,
        defaultValue = null,
        onChange,
        placeholder,
        ungroupedLabel,
        addons,
        filter,
        className,
        "aria-label": ariaLabel,
        "aria-labelledby": ariaLabelledby,
    } = props;

    const { state, controller } = useSelectBox<TExtra>({
        ...(options !== undefined ? { options } : {}),
        ...(groups !== undefined ? { groups } : {}),
        ...(addons !== undefined ? { addons } : {}),
        ...(filter !== undefined ? { filter } : {}),
        ...(ungroupedLabel !== undefined ? { ungroupedLabel } : {}),
        initialValue: defaultValue,
    });

    useNotifyOnChange(state.value, state.selectedOption, onChange);

    const rootRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);
    useEffect(() => {
        if (!state.open) return;
        function handleMouseDown(event: globalThis.MouseEvent): void {
            if (!(event.target instanceof Node)) return;
            if (rootRef.current?.contains(event.target)) return;
            controller.close();
        }
        document.addEventListener("mousedown", handleMouseDown);
        return () => {
            document.removeEventListener("mousedown", handleMouseDown);
        };
    }, [state.open, controller]);

    useEffect(() => {
        if (!state.open) return;
        // autoFocus misfires inside iframes without OS focus; programmatic focus is reliable.
        searchRef.current?.focus({ preventScroll: true });
    }, [state.open]);

    function handleKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
        if (event.key === "ArrowDown") {
            event.preventDefault();
            if (!state.open) controller.open();
            else controller.moveActive(1);
            return;
        }
        if (event.key === "ArrowUp") {
            event.preventDefault();
            controller.moveActive(-1);
            return;
        }
        if (event.key === "Enter") {
            event.preventDefault();
            controller.commitActive();
            return;
        }
        if (event.key === "Escape") {
            event.preventDefault();
            controller.close();
        }
    }

    function handleOptionMouseDown(event: MouseEvent<HTMLButtonElement>): void {
        event.preventDefault();
    }

    const rootClassName = ["select-box", className].filter(Boolean).join(" ");

    return (
        <div ref={rootRef} className={rootClassName} data-select-root>
            <button
                type="button"
                className="select-box-trigger"
                onClick={() => controller.toggle()}
                aria-haspopup="listbox"
                aria-expanded={state.open}
                aria-label={ariaLabel}
                aria-labelledby={ariaLabelledby}
                data-select-trigger
            >
                <span className={state.selectedOption ? "select-box-value" : "select-box-value select-box-placeholder"}>
                    {state.selectedOption?.label ?? placeholder ?? "Select…"}
                </span>
                <span className="select-box-caret" aria-hidden>
                    ▾
                </span>
            </button>

            {state.open ? (
                <div className="select-box-popover" role="listbox" data-select-popover>
                    <input
                        ref={searchRef}
                        className="select-box-search"
                        type="text"
                        placeholder={placeholder ?? "Search…"}
                        value={state.query}
                        onChange={(event) => controller.setQuery(event.target.value)}
                        onKeyDown={handleKeyDown}
                        data-select-search
                    />

                    {state.isEmpty ? (
                        <div className="select-box-list" data-select-list>
                            <p className="select-box-empty" data-select-empty>
                                No matches
                            </p>
                        </div>
                    ) : (
                        <VirtualizedList
                            groups={state.filteredGroups}
                            activeIndex={state.activeIndex}
                            controller={controller}
                            handleOptionMouseDown={handleOptionMouseDown}
                        />
                    )}
                </div>
            ) : null}
        </div>
    );
}

interface VirtualizedListProps<TExtra extends object> {
    readonly groups: ReadonlyArray<SelectGroup<TExtra>>;
    readonly activeIndex: number;
    readonly controller: ReturnType<typeof useSelectBox<TExtra>>["controller"];
    readonly handleOptionMouseDown: (event: MouseEvent<HTMLButtonElement>) => void;
}

function VirtualizedList<TExtra extends object>({
    groups,
    activeIndex,
    controller,
    handleOptionMouseDown,
}: VirtualizedListProps<TExtra>): JSX.Element {
    const listRef = useRef<HTMLDivElement>(null);

    const rows = useMemo(() => flattenGroupsForVirtualization(groups), [groups]);

    const [virtualizer] = useState(
        () =>
            new ListVirtualizer({
                rowCount: rows.length,
                rowHeight: makeRowHeight(rows),
                viewportHeight: LIST_VIEWPORT_HEIGHT,
            }),
    );

    useEffect(() => {
        virtualizer.setRowCount(rows.length);
        virtualizer.setRowHeight(makeRowHeight(rows));
    }, [virtualizer, rows]);

    const subscribe = useCallback(
        (listener: () => void) => virtualizer.subscribe(listener),
        [virtualizer],
    );
    const getSnapshot = useCallback(() => virtualizer.getRange(), [virtualizer]);
    const range = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

    useEffect(() => {
        const list = listRef.current;
        if (!list) return;
        function handleScroll(): void {
            virtualizer.setScrollOffset(list!.scrollTop);
        }
        list.addEventListener("scroll", handleScroll, { passive: true });
        return () => {
            list.removeEventListener("scroll", handleScroll);
        };
    }, [virtualizer]);

    useEffect(() => {
        const list = listRef.current;
        if (!list) return;
        const targetRow = findRowIndexForActiveIndex(rows, activeIndex);
        if (targetRow < 0) return;
        const targetOffset = virtualizer.getOffset(targetRow);
        const targetHeight = rows[targetRow]!.kind === "header" ? HEADER_ROW_HEIGHT : OPTION_ROW_HEIGHT;
        const viewportTop = list.scrollTop;
        const viewportBottom = viewportTop + list.clientHeight;
        if (targetOffset < viewportTop) {
            list.scrollTop = targetOffset;
        } else if (targetOffset + targetHeight > viewportBottom) {
            list.scrollTop = targetOffset + targetHeight - list.clientHeight;
        }
    }, [virtualizer, rows, activeIndex]);

    return (
        <div
            ref={listRef}
            className="select-box-list"
            data-select-list
            style={{ maxHeight: LIST_VIEWPORT_HEIGHT, overflowY: "auto" }}
        >
            <div style={{ paddingTop: range.paddingTop, paddingBottom: range.paddingBottom }}>
                {range.visibleRows.map((virtualRow) => {
                    const row = rows[virtualRow.index]!;
                    if (row.kind === "header") {
                        return (
                            <div
                                key={`header-${row.groupIndex}`}
                                className="select-box-group-label"
                                data-select-group-label
                                style={{ height: HEADER_ROW_HEIGHT }}
                            >
                                {row.group.label}
                            </div>
                        );
                    }
                    const isActive = isOptionActive(rows, virtualRow.index, activeIndex);
                    const classes = [
                        "select-box-option",
                        isActive ? "select-box-option-active" : null,
                        row.option.disabled ? "select-box-option-disabled" : null,
                    ]
                        .filter(Boolean)
                        .join(" ");
                    return (
                        <button
                            key={row.option.value}
                            type="button"
                            className={classes}
                            disabled={row.option.disabled}
                            onMouseDown={handleOptionMouseDown}
                            onClick={() => controller.commitOption(row.option)}
                            data-select-option
                            data-select-active={isActive ? "" : undefined}
                            style={{ height: OPTION_ROW_HEIGHT }}
                        >
                            {row.option.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

function makeRowHeight<TExtra extends object>(
    rows: ReadonlyArray<SelectBoxRow<TExtra>>,
): (index: number) => number {
    return (index) => (rows[index]?.kind === "header" ? HEADER_ROW_HEIGHT : OPTION_ROW_HEIGHT);
}

function isOptionActive<TExtra extends object>(
    rows: ReadonlyArray<SelectBoxRow<TExtra>>,
    rowIndex: number,
    activeIndex: number,
): boolean {
    if (activeIndex < 0) return false;
    return findRowIndexForActiveIndex(rows, activeIndex) === rowIndex;
}

function useNotifyOnChange<TExtra extends object>(
    currentValue: string | null,
    currentOption: SelectOption<TExtra> | null,
    onChange: ((value: string | null, option: SelectOption<TExtra> | null) => void) | undefined,
): void {
    const callbackRef = useRef(onChange);
    callbackRef.current = onChange;
    const previousValueRef = useRef<string | null>(currentValue);

    useEffect(() => {
        if (currentValue === previousValueRef.current) return;
        previousValueRef.current = currentValue;
        callbackRef.current?.(currentValue, currentOption);
    }, [currentValue, currentOption]);
}
