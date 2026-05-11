import type {
    OptionFilterStrategy,
    SelectBoxAddon,
    SelectGroup,
    SelectOption,
} from "@select-box/core";
import { useEffect, useRef, type JSX, type KeyboardEvent, type MouseEvent } from "react";

import { useSelectBox } from "./use-select-box.js";

export interface SelectBoxProps<TValue> {
    readonly options?: ReadonlyArray<SelectOption<TValue>>;
    readonly groups?: ReadonlyArray<SelectGroup<TValue>>;
    /** Initial value. The component owns the selection internally; listen via `onValueChange`. */
    readonly defaultValue?: TValue | null;
    /** Fires whenever the committed value changes (including `clear()`). */
    readonly onValueChange?: (value: TValue | null) => void;
    readonly placeholder?: string;
    readonly ungroupedLabel?: string;
    readonly addons?: ReadonlyArray<SelectBoxAddon<TValue>>;
    readonly filter?: OptionFilterStrategy<TValue>;
    /** Extra class applied to the root element. */
    readonly className?: string;
    readonly "aria-label"?: string;
    readonly "aria-labelledby"?: string;
}

/**
 * Default single-select combobox component. Drop-in for the common case;
 * for custom markup or layout, use `useSelectBox()` directly instead and
 * render against the snapshot.
 *
 * Styling is **not bundled** — the component emits stable class names
 * (`select-box`, `select-box-trigger`, `select-box-option`, …) and data
 * attributes (`data-select-trigger`, `data-select-option`, …) that
 * consumers target with their own CSS or design-system rules.
 */
export function SelectBox<TValue>(props: SelectBoxProps<TValue>): JSX.Element {
    const {
        options,
        groups,
        defaultValue = null,
        onValueChange,
        placeholder,
        ungroupedLabel,
        addons,
        filter,
        className,
        "aria-label": ariaLabel,
        "aria-labelledby": ariaLabelledby,
    } = props;

    const { state, controller } = useSelectBox<TValue>({
        ...(options !== undefined ? { options } : {}),
        ...(groups !== undefined ? { groups } : {}),
        ...(addons !== undefined ? { addons } : {}),
        ...(filter !== undefined ? { filter } : {}),
        ...(ungroupedLabel !== undefined ? { ungroupedLabel } : {}),
        initialValue: defaultValue,
    });

    useNotifyOnValueChange(state.value, onValueChange);

    const rootRef = useRef<HTMLDivElement>(null);
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
                        className="select-box-search"
                        type="text"
                        autoFocus
                        placeholder={placeholder ?? "Search…"}
                        value={state.query}
                        onChange={(event) => controller.setQuery(event.target.value)}
                        onKeyDown={handleKeyDown}
                        data-select-search
                    />

                    <div className="select-box-list" data-select-list>
                        {state.isEmpty ? (
                            <p className="select-box-empty" data-select-empty>
                                No matches
                            </p>
                        ) : (
                            renderGroups(state, controller, handleOptionMouseDown)
                        )}
                    </div>
                </div>
            ) : null}
        </div>
    );
}

function renderGroups<TValue>(
    state: ReturnType<typeof useSelectBox<TValue>>["state"],
    controller: ReturnType<typeof useSelectBox<TValue>>["controller"],
    handleOptionMouseDown: (event: MouseEvent<HTMLButtonElement>) => void,
): JSX.Element[] {
    let flatIndex = -1;
    return state.filteredGroups.map((group) => (
        <div key={group.key} className="select-box-group" data-select-group>
            {group.label ? <div className="select-box-group-label">{group.label}</div> : null}
            {group.options.map((option) => {
                const isSelectable = !option.disabled;
                if (isSelectable) flatIndex += 1;
                const isActive = isSelectable && flatIndex === state.activeIndex;
                const classes = [
                    "select-box-option",
                    isActive ? "select-box-option-active" : null,
                    option.disabled ? "select-box-option-disabled" : null,
                ]
                    .filter(Boolean)
                    .join(" ");
                return (
                    <button
                        key={String(option.value)}
                        type="button"
                        className={classes}
                        disabled={option.disabled}
                        onMouseDown={handleOptionMouseDown}
                        onClick={() => controller.commitOption(option)}
                        data-select-option
                        data-select-active={isActive ? "" : undefined}
                    >
                        {option.label}
                    </button>
                );
            })}
        </div>
    ));
}

function useNotifyOnValueChange<TValue>(
    currentValue: TValue | null,
    onValueChange: ((value: TValue | null) => void) | undefined,
): void {
    const callbackRef = useRef(onValueChange);
    callbackRef.current = onValueChange;
    const previousValueRef = useRef<TValue | null>(currentValue);

    useEffect(() => {
        if (Object.is(currentValue, previousValueRef.current)) return;
        previousValueRef.current = currentValue;
        callbackRef.current?.(currentValue);
    }, [currentValue]);
}

