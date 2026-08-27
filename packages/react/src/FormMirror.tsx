import type { SelectBoxController, SelectBoxSnapshot, SelectionValue } from "@select-box/core";
import { useEffect, useRef, type JSX } from "react";

export interface FormMirrorProps<TExtra extends object> {
    readonly state: SelectBoxSnapshot<TExtra, SelectionValue>;
    readonly controller: SelectBoxController<TExtra, SelectionValue>;
    readonly name: string | undefined;
    readonly required: boolean | undefined;
}

/**
 * A real `<select>`, visually hidden, mirroring the current selection.
 *
 * This is what carries the widget into a form. Nothing about submission or
 * constraint validation is reimplemented: the browser sees a native control
 * with a `name`, `required` and the selected options, so submission, `required`
 * blocking, `form.reset()` and autofill all behave natively. Custom-element
 * wrappers get the same reach through `ElementInternals` instead.
 *
 * Renders nothing without a `name`, matching a nameless native control that
 * stays out of the form data.
 */
export function FormMirror<TExtra extends object>({
    state,
    controller,
    name,
    required,
}: FormMirrorProps<TExtra>): JSX.Element | null {
    const mirrorRef = useRef<HTMLSelectElement>(null);
    // The widget owns the reset, so the mirror's default is whatever it holds
    // right now. Without this the browser's reset lands on the empty option
    // while the controller restores its default, and the two disagree.
    useEffect(() => {
        const mirror = mirrorRef.current;
        if (mirror === null) return;
        for (const option of mirror.options) option.defaultSelected = option.selected;
    });
    useEffect(() => {
        const form = mirrorRef.current?.form;
        if (!form) return;
        function handleReset(): void {
            controller.reset();
        }
        form.addEventListener("reset", handleReset);
        return () => form.removeEventListener("reset", handleReset);
    }, [controller, name]);

    if (name === undefined || name === "") return null;

    const isMulti = state.mode === "multi";
    const selected = state.selectedOptions.map((option) => option.value);
    // Only what submission needs: the chosen options, plus the empty one that
    // lets `required` fail while nothing is selected. Mirroring the whole list
    // would undo the windowing the popover does — a named box over a hundred
    // thousand options would put every one of them in the document — and
    // mirroring the *filtered* list would drop the selection the moment a query
    // excluded it, leaving the browser to fall back to the first option.
    const options = [
        ...(isMulti ? [] : [{ value: "", label: "" }]),
        ...state.selectedOptions.map((option) => ({ value: option.value, label: option.label })),
    ];

    return (
        <select
            ref={mirrorRef}
            className="select-box-form-mirror"
            data-select-form-mirror
            aria-hidden="true"
            tabIndex={-1}
            name={name}
            multiple={isMulti}
            required={required === true}
            disabled={state.disabled}
            value={isMulti ? selected : (selected[0] ?? "")}
            onChange={() => {
                // The widget owns the selection; this control only reports it.
            }}
        >
            {options.map((option) => (
                <option key={option.value} value={option.value}>
                    {option.label}
                </option>
            ))}
        </select>
    );
}
