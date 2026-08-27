import {
    type OptionFilterStrategy,
    type SelectBoxAddon,
    type SelectBoxController,
    type SelectBoxControllerConfig,
    type SelectionValue,
    type SelectionValueInput,
    type SelectOption,
} from "@select-box/core";
import {
    useEffect,
    useImperativeHandle,
    useRef,
    type CSSProperties,
    type FocusEventHandler,
    type JSX,
    type Ref,
} from "react";

import { useFilterReactivity } from "./hooks/use-filter-reactivity.js";
import { useInteractivityReactivity } from "./hooks/use-interactivity-reactivity.js";
import { useOptionsReactivity } from "./hooks/use-options-reactivity.js";
import { useNotifyChange } from "./hooks/use-notify-change.js";
import { useSelectBox } from "./hooks/use-select-box.js";
import { useValueReactivity } from "./hooks/use-value-reactivity.js";
import { InlineSurface } from "./InlineSurface.js";
import { PopoverSurface } from "./PopoverSurface.js";

/** Rendering style. `"popover"` is the default combobox-with-dropdown surface;
 * `"inline"` renders every option as a toggleable chip with no popover, no
 * trigger input, and no search. Selection cardinality (`multi`) is orthogonal
 * — both surfaces work in single and multi modes. Mutable at runtime. */
export type SelectBoxSurface = "popover" | "inline";

/**
 * Imperative handle a `ref` on `<SelectBox>` receives.
 *
 * Escape hatch for behaviour the props do not cover; carries the same two
 * members every wrapper exposes.
 */
export interface SelectBoxHandle<TExtra extends object = object> {
    /** Root element, the same node `data-select-root` marks. */
    readonly root: HTMLDivElement | null;
    /** Core controller driving this instance. */
    readonly controller: SelectBoxController<TExtra, SelectionValue>;
}

interface SelectBoxBaseProps<TExtra extends object> {
    readonly options?: ReadonlyArray<SelectOption<TExtra>> | undefined;
    readonly placeholder?: string | undefined;
    readonly ungroupedLabel?: string | undefined;
    readonly addons?: ReadonlyArray<SelectBoxAddon<TExtra>> | undefined;
    readonly filter?: OptionFilterStrategy<TExtra> | undefined;
    readonly surface?: SelectBoxSurface | undefined;
    /** Refuses every interaction and stays out of the form data, like a disabled input. */
    readonly disabled?: boolean | undefined;
    /** Refuses changes while staying focusable and submitted, like a readonly input. */
    readonly readOnly?: boolean | undefined;
    /** Field name under which the selection is submitted. Omit to stay out of the form. */
    readonly name?: string | undefined;
    /** Blocks submission while nothing is selected, natively. */
    readonly required?: boolean | undefined;
    readonly className?: string | undefined;
    readonly style?: CSSProperties | undefined;
    /**
     * Identifies the whole component; lands on the root element.
     *
     * Not what `<label for>` should point at — a label has to target a
     * labelable control, which is the trigger input. Use `inputId` for that.
     */
    readonly id?: string | undefined;
    /**
     * Id for the trigger input, and therefore what `<label for>` must target.
     *
     * The popover surface has the input; the inline surface has none, and
     * ignores this.
     */
    readonly inputId?: string | undefined;
    /** Fires when focus leaves the trigger input — what form libraries call touched. */
    readonly onBlur?: FocusEventHandler<HTMLInputElement> | undefined;
    /** Fires when the trigger input takes focus. */
    readonly onFocus?: FocusEventHandler<HTMLInputElement> | undefined;
    /** Tab order of the trigger input. */
    readonly tabIndex?: number | undefined;
    /** Receives the imperative handle: the root element and the core controller. */
    readonly ref?: Ref<SelectBoxHandle<TExtra>> | undefined;
    readonly "aria-label"?: string | undefined;
    readonly "aria-labelledby"?: string | undefined;
}

export interface SelectBoxSingleProps<TExtra extends object = object>
    extends SelectBoxBaseProps<TExtra> {
    readonly multiple?: false;
    /**
     * Selection owned by the caller, applied even while the control refuses input.
     *
     * Makes the box controlled: a pick the owner does not answer through
     * `onChange` is reverted to what the prop still says, as with `<select value>`.
     */
    readonly value?: string | number | null;
    /** Initial value for an uncontrolled box (coerced to string). Ignored once `value` is supplied. */
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
    readonly multiple: true;
    /**
     * Selection owned by the caller, applied even while the control refuses input.
     *
     * Makes the box controlled: a pick the owner does not answer through
     * `onChange` is reverted to what the prop still says, as with `<select value>`.
     */
    readonly value?: ReadonlyArray<string | number>;
    /** Initial selection for an uncontrolled box. Ignored once `value` is supplied. */
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
    const initialMulti = props.multiple === true;
    const defaultValue: SelectionValueInput =
        props.value ?? (initialMulti ? (props.defaultValue ?? []) : (props.defaultValue ?? null));

    const controllerConfig: SelectBoxControllerConfig<TExtra> = {
        mode: initialMulti ? "multi" : "single",
        ...(props.options !== undefined ? { options: props.options } : {}),
        ...(props.addons !== undefined ? { addons: props.addons } : {}),
        ...(props.filter !== undefined ? { filter: props.filter } : {}),
        ...(props.ungroupedLabel !== undefined ? { ungroupedLabel: props.ungroupedLabel } : {}),
        defaultValue,
        disabled: props.disabled === true,
        readOnly: props.readOnly === true,
    };

    const { state, controller } = useSelectBox<TExtra>(
        controllerConfig as Parameters<typeof useSelectBox<TExtra>>[0],
    );

    const wantMulti = props.multiple === true;
    useEffect(() => {
        const currentMulti = controller.mode === "multi";
        if (currentMulti !== wantMulti) {
            controller.setMode(wantMulti ? "multi" : "single");
        }
    }, [controller, wantMulti]);

    // Shared between the two directions of a controlled value: what the owner
    // pushed in, so the notifier does not read it back out as a fresh change.
    const ownerEcho = useRef<string | null>(null);

    // Order matters: the notifier reads the snapshot that just published, and
    // the value sync overwrites the echo with what it is about to push. Announce
    // first, assert second, or every announcement carries the next push's echo.
    useNotifyChange(state, props.onChange, ownerEcho);
    useValueReactivity(controller, props.value, state.value, ownerEcho);
    useFilterReactivity(controller, props.filter);
    useOptionsReactivity(controller, props.options);
    useInteractivityReactivity(controller, props.disabled, props.readOnly);

    const rootRef = useRef<HTMLDivElement>(null);
    // `root` is a getter, not a captured value: switching surfaces mounts a
    // different root element, and a captured node would dangle outside the tree.
    useImperativeHandle(
        props.ref,
        () => ({
            get root(): HTMLDivElement | null {
                return rootRef.current;
            },
            controller,
        }),
        [controller],
    );

    if (props.surface === "inline") {
        return (
            <InlineSurface<TExtra>
                state={state}
                controller={controller}
                rootRef={rootRef}
                name={props.name}
                required={props.required}
                className={props.className}
                style={props.style}
                id={props.id}
                onBlur={props.onBlur}
                onFocus={props.onFocus}
                ariaLabel={props["aria-label"]}
                ariaLabelledby={props["aria-labelledby"]}
            />
        );
    }

    return (
        <PopoverSurface<TExtra>
            state={state}
            controller={controller}
            rootRef={rootRef}
            name={props.name}
            required={props.required}
            placeholder={props.placeholder}
            className={props.className}
            style={props.style}
            id={props.id}
            inputId={props.inputId}
            onBlur={props.onBlur}
            onFocus={props.onFocus}
            tabIndex={props.tabIndex}
            ariaLabel={props["aria-label"]}
            ariaLabelledby={props["aria-labelledby"]}
        />
    );
}
