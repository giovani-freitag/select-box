import {
    SelectBoxListVirtualizer,
    SelectBoxRowModel,
    type OptionFilterStrategy,
    type SelectBoxAddon,
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

const ESTIMATED_OPTION_HEIGHT = 36;
const ESTIMATED_HEADER_HEIGHT = 28;
const LIST_VIEWPORT_HEIGHT = 240;

export interface SelectBoxProps<TExtra extends object = object> {
    readonly options?: ReadonlyArray<SelectOption<TExtra>>;
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
        ...(addons !== undefined ? { addons } : {}),
        ...(filter !== undefined ? { filter } : {}),
        ...(ungroupedLabel !== undefined ? { ungroupedLabel } : {}),
        initialValue: defaultValue,
    });

    useEffect(() => {
        if (filter === undefined) return;
        controller.setFilter(filter);
    }, [controller, filter]);

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

    const rowModel = useMemo(() => new SelectBoxRowModel<TExtra>({ groups }), [groups]);
    const rowModelRef = useRef(rowModel);
    rowModelRef.current = rowModel;

    const [virtualizer] = useState(
        () =>
            new SelectBoxListVirtualizer({
                getScrollElement: () => listRef.current,
                getCount: () => rowModelRef.current.length,
                estimateSize: (index) => estimateRowSize(rowModelRef.current, index),
                initialViewportHeight: LIST_VIEWPORT_HEIGHT,
            }),
    );

    useEffect(() => {
        virtualizer.mount();
        return () => virtualizer.dispose();
    }, [virtualizer]);

    useEffect(() => {
        virtualizer.sync();
    }, [virtualizer, rowModel]);

    const subscribe = useCallback(
        (listener: () => void) => virtualizer.subscribe(listener),
        [virtualizer],
    );
    const getSnapshot = useCallback(
        () => virtualizer.getVirtualItems(),
        [virtualizer],
    );
    const virtualItems = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
    const totalSize = virtualizer.getTotalSize();
    const paddingTop = virtualItems[0]?.start ?? 0;
    const paddingBottom = totalSize - (virtualItems.at(-1)?.end ?? 0);

    const activeRowIndex = rowModel.findRowIndexForActiveIndex(activeIndex);

    useEffect(() => {
        if (activeRowIndex < 0) return;
        virtualizer.scrollToIndex(activeRowIndex, "auto");
    }, [virtualizer, activeRowIndex]);

    return (
        <div
            ref={listRef}
            className="select-box-list"
            data-select-list
            style={{ maxHeight: LIST_VIEWPORT_HEIGHT, overflowY: "auto" }}
        >
            <div style={{ paddingTop, paddingBottom: Math.max(0, paddingBottom) }}>
                {virtualItems.map((virtualRow) => {
                    const row = rowModel.getRowAt(virtualRow.index);
                    if (!row) return null;
                    const measureRef = (node: HTMLElement | null): void => {
                        virtualizer.measureElement(node);
                    };
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
                            ref={measureRef}
                            data-index={virtualRow.index}
                            type="button"
                            className={classes}
                            disabled={row.option.disabled}
                            onMouseDown={handleOptionMouseDown}
                            onClick={() => controller.commitOption(row.option)}
                            data-select-option
                            data-select-active={isActive ? "" : undefined}
                        >
                            {row.option.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

function estimateRowSize<TExtra extends object>(
    rowModel: SelectBoxRowModel<TExtra>,
    index: number,
): number {
    return rowModel.getRowAt(index)?.kind === "header"
        ? ESTIMATED_HEADER_HEIGHT
        : ESTIMATED_OPTION_HEIGHT;
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
