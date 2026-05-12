import type {
    OptionFilterStrategy,
    SelectBoxAddon,
    SelectGroup,
    SelectOption,
} from "@select-box/core";
import { useEffect, useRef, type JSX, type KeyboardEvent, type MouseEvent } from "react";

import { useSelectBox } from "./use-select-box.js";

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

function renderGroups<TExtra extends object>(
    state: ReturnType<typeof useSelectBox<TExtra>>["state"],
    controller: ReturnType<typeof useSelectBox<TExtra>>["controller"],
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
                        key={option.value}
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
