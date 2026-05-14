import {
    SelectBoxKeyDispatcher,
    SelectBoxSnapshotView,
    type OptionFilterStrategy,
    type SelectBoxAddon,
    type SelectBoxControllerConfig,
    type SelectBoxSnapshot,
    type SelectionValue,
    type SelectionValueInput,
    type SelectOption,
} from "@select-box/core";
import {
    useEffect,
    useRef,
    type ChangeEvent,
    type JSX,
    type KeyboardEvent,
    type MouseEvent,
    type RefObject,
} from "react";

import { useSelectBox, type UseSelectBoxResult } from "./use-select-box.js";
import {
    useClickOutsideClose,
    useFilterReactivity,
    useNotifyChange,
    useSelectBoxKeyDispatcher,
} from "./internal/hooks.js";
import { SelectPopover } from "./internal/SelectPopover.js";

/* ---------------- props ---------------- */

interface SelectBoxBaseProps<TExtra extends object> {
    readonly options?: ReadonlyArray<SelectOption<TExtra>>;
    readonly placeholder?: string;
    readonly ungroupedLabel?: string;
    readonly addons?: ReadonlyArray<SelectBoxAddon<TExtra>>;
    readonly filter?: OptionFilterStrategy<TExtra>;
    readonly className?: string;
    readonly "aria-label"?: string;
    readonly "aria-labelledby"?: string;
}

export interface SelectBoxSingleProps<TExtra extends object = object>
    extends SelectBoxBaseProps<TExtra> {
    readonly multi?: false;
    /** Initial value (coerced to string). The component owns the selection internally; listen via `onChange`. */
    readonly defaultValue?: string | number | null;
    /**
     * Fires whenever the committed value changes (including `clear()`).
     * Matches native `<select>` semantics: `value` is the canonical string
     * identifier; `option` is the full option object (with any extra payload).
     */
    readonly onChange?: (value: string | null, option: SelectOption<TExtra> | null) => void;
}

export interface SelectBoxMultiProps<TExtra extends object = object>
    extends SelectBoxBaseProps<TExtra> {
    readonly multi: true;
    /** Initial selection (each value coerced to string; duplicates dropped). */
    readonly defaultValue?: ReadonlyArray<string | number>;
    /** Fires whenever the committed selection changes. Both args are stable per change. */
    readonly onChange?: (
        values: ReadonlyArray<string>,
        options: ReadonlyArray<SelectOption<TExtra>>,
    ) => void;
}

/**
 * Discriminated union of single- and multi-select props. Set `multi` to `true`
 * for multi-select semantics; the rest of the surface stays consistent.
 */
export type SelectBoxProps<TExtra extends object = object> =
    | SelectBoxSingleProps<TExtra>
    | SelectBoxMultiProps<TExtra>;

/**
 * Default select-box component. `multi` switches between single-pick (replace
 * on commit, popover closes) and multi-pick (toggle on commit, popover stays
 * open). Toggling `multi` at runtime preserves the current selection
 * (single→multi wraps as singleton, multi→single keeps the first option),
 * mirroring how the browser handles `<select multiple>` toggle. Drop to
 * `useSelectBox()` for fully custom markup.
 */
export function SelectBox<TExtra extends object = object>(
    props: SelectBoxProps<TExtra>,
): JSX.Element {
    const initialMulti = props.multi === true;
    const initialValue: SelectionValueInput = initialMulti
        ? ((props.defaultValue as ReadonlyArray<string | number> | undefined) ?? [])
        : ((props.defaultValue as string | number | null | undefined) ?? null);

    const controllerConfig: SelectBoxControllerConfig<TExtra> = {
        mode: initialMulti ? "multi" : "single",
        ...(props.options !== undefined ? { options: props.options } : {}),
        ...(props.addons !== undefined ? { addons: props.addons } : {}),
        ...(props.filter !== undefined ? { filter: props.filter } : {}),
        ...(props.ungroupedLabel !== undefined ? { ungroupedLabel: props.ungroupedLabel } : {}),
        initialValue,
    };

    const { state, controller } = useSelectBox<TExtra>(
        controllerConfig as Parameters<typeof useSelectBox<TExtra>>[0],
    );

    const wantMulti = props.multi === true;
    useEffect(() => {
        const currentMulti = controller.mode === "multi";
        if (currentMulti !== wantMulti) {
            controller.setMode(wantMulti ? "multi" : "single");
        }
    }, [controller, wantMulti]);

    const rootRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const keyDispatcher = useSelectBoxKeyDispatcher(controller);

    useFilterReactivity(controller, props.filter);
    useClickOutsideClose(rootRef, state.open, controller);
    useNotifyChange(state, props.onChange as SelectBoxProps<TExtra>["onChange"]);

    const isMulti = state.mode === "multi";
    const rootClassName = [
        "select-box",
        isMulti ? "select-box-multi" : null,
        props.className,
    ]
        .filter(Boolean)
        .join(" ");

    function focusInput(): void {
        inputRef.current?.focus({ preventScroll: true });
    }

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
                    controller={controller as UseSelectBoxResult<TExtra, SelectionValue>["controller"]}
                    inputRef={inputRef}
                    keyDispatcher={keyDispatcher as SelectBoxKeyDispatcher<TExtra, SelectionValue>}
                    placeholder={props.placeholder}
                    ariaLabel={props["aria-label"]}
                    ariaLabelledby={props["aria-labelledby"]}
                    onFocusInput={focusInput}
                />
            ) : (
                <SingleTrigger
                    state={state}
                    controller={controller as UseSelectBoxResult<TExtra, SelectionValue>["controller"]}
                    inputRef={inputRef}
                    keyDispatcher={keyDispatcher as SelectBoxKeyDispatcher<TExtra, SelectionValue>}
                    placeholder={props.placeholder}
                    ariaLabel={props["aria-label"]}
                    ariaLabelledby={props["aria-labelledby"]}
                />
            )}

            {state.open ? (
                <SelectPopover<TExtra, SelectionValue>
                    mode={state.mode}
                    state={state}
                    controller={controller as UseSelectBoxResult<TExtra, SelectionValue>["controller"]}
                    onAfterCommit={isMulti ? focusInput : undefined}
                />
            ) : null}
        </div>
    );
}

/* ---------------- single trigger ---------------- */

interface SingleTriggerProps<TExtra extends object> {
    readonly state: SelectBoxSnapshot<TExtra, SelectionValue>;
    readonly controller: UseSelectBoxResult<TExtra, SelectionValue>["controller"];
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
    readonly controller: UseSelectBoxResult<TExtra, SelectionValue>["controller"];
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
