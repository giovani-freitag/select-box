import {
    type OptionFilterStrategy,
    type SelectBoxAddon,
    type SelectBoxController,
    type SelectBoxControllerConfig,
    type SelectionValue,
    type SelectionValueInput,
    type SelectOption,
} from "@select-box/core";
import { useEffect, useImperativeHandle, useRef, type JSX, type Ref } from "react";

import { useFilterReactivity } from "./hooks/use-filter-reactivity.js";
import { useInteractivityReactivity } from "./hooks/use-interactivity-reactivity.js";
import { useOptionsReactivity } from "./hooks/use-options-reactivity.js";
import { useNotifyChange } from "./hooks/use-notify-change.js";
import { useSelectBox } from "./hooks/use-select-box.js";
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
    /** Receives the imperative handle: the root element and the core controller. */
    readonly ref?: Ref<SelectBoxHandle<TExtra>> | undefined;
    readonly "aria-label"?: string | undefined;
    readonly "aria-labelledby"?: string | undefined;
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
        ? (props.defaultValue ?? [])
        : (props.defaultValue ?? null);

    const controllerConfig: SelectBoxControllerConfig<TExtra> = {
        mode: initialMulti ? "multi" : "single",
        ...(props.options !== undefined ? { options: props.options } : {}),
        ...(props.addons !== undefined ? { addons: props.addons } : {}),
        ...(props.filter !== undefined ? { filter: props.filter } : {}),
        ...(props.ungroupedLabel !== undefined ? { ungroupedLabel: props.ungroupedLabel } : {}),
        initialValue,
        disabled: props.disabled === true,
        readOnly: props.readOnly === true,
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

    useFilterReactivity(controller, props.filter);
    useOptionsReactivity(controller, props.options);
    useInteractivityReactivity(controller, props.disabled, props.readOnly);
    useNotifyChange(state, props.onChange);

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
            ariaLabel={props["aria-label"]}
            ariaLabelledby={props["aria-labelledby"]}
        />
    );
}
