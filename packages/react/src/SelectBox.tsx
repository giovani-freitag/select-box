import {
    type OptionFilterStrategy,
    type SelectBoxAddon,
    type SelectBoxControllerConfig,
    type SelectionValueInput,
    type SelectOption,
} from "@select-box/core";
import { useEffect, type JSX } from "react";

import { useFilterReactivity } from "./hooks/use-filter-reactivity.js";
import { useNotifyChange } from "./hooks/use-notify-change.js";
import { useSelectBox } from "./hooks/use-select-box.js";
import { InlineSurface } from "./InlineSurface.js";
import { PopoverSurface } from "./PopoverSurface.js";

/** Rendering style. `"popover"` is the default combobox-with-dropdown surface;
 * `"inline"` renders every option as a toggleable chip with no popover, no
 * trigger input, and no search. Selection cardinality (`multi`) is orthogonal
 * — both surfaces work in single and multi modes. Mutable at runtime. */
export type SelectBoxSurface = "popover" | "inline";

interface SelectBoxBaseProps<TExtra extends object> {
    readonly options?: ReadonlyArray<SelectOption<TExtra>>;
    readonly placeholder?: string;
    readonly ungroupedLabel?: string;
    readonly addons?: ReadonlyArray<SelectBoxAddon<TExtra>>;
    readonly filter?: OptionFilterStrategy<TExtra>;
    readonly surface?: SelectBoxSurface;
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

    useFilterReactivity(controller, props.filter);
    useNotifyChange(state, props.onChange as SelectBoxProps<TExtra>["onChange"]);

    const typedController = controller as ReturnType<
        typeof useSelectBox<TExtra>
    >["controller"];

    if (props.surface === "inline") {
        return (
            <InlineSurface<TExtra>
                state={state}
                controller={typedController}
                className={props.className}
                ariaLabel={props["aria-label"]}
                ariaLabelledby={props["aria-labelledby"]}
            />
        );
    }

    return (
        <PopoverSurface<TExtra>
            state={state}
            controller={typedController}
            placeholder={props.placeholder}
            className={props.className}
            ariaLabel={props["aria-label"]}
            ariaLabelledby={props["aria-labelledby"]}
        />
    );
}
