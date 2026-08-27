import {
    SelectBoxSnapshotView,
    type SelectBoxSnapshot,
    type SelectionValue,
    type SelectOption,
} from "@select-box/core";
import { useEffect, useRef, type RefObject } from "react";

/**
 * Mode-aware change notifier. Fires the consumer's `onChange` whenever the
 * committed value content changes (compared via `valueKey`), dispatching with
 * the single-mode signature `(value, option)` or the multi-mode signature
 * `(values, options)` based on the snapshot's `mode` at fire time.
 *
 * A change the owner itself pushed in through `value` is swallowed rather than
 * announced: telling an owner what it just asked for is an echo, and answering
 * that echo is how a controlled component ends up in a loop.
 */
export function useNotifyChange<TExtra extends object>(
    state: SelectBoxSnapshot<TExtra, SelectionValue>,
    onChange:
        | ((value: string | null, option: SelectOption<TExtra> | null) => void)
        | ((
              values: ReadonlyArray<string>,
              options: ReadonlyArray<SelectOption<TExtra>>,
          ) => void)
        | undefined,
    ownerEcho?: RefObject<string | null>,
): void {
    const callbackRef = useRef(onChange);
    callbackRef.current = onChange;

    const currentKey = SelectBoxSnapshotView.valueKey(state.value);
    const previousKeyRef = useRef(currentKey);

    useEffect(() => {
        if (currentKey === previousKeyRef.current) return;
        previousKeyRef.current = currentKey;

        const echoed = ownerEcho?.current === currentKey;
        if (ownerEcho) ownerEcho.current = null;
        if (echoed) return;

        const cb = callbackRef.current;
        if (cb === undefined) return;
        if (state.mode === "multi") {
            (cb as (
                values: ReadonlyArray<string>,
                options: ReadonlyArray<SelectOption<TExtra>>,
            ) => void)(state.value as ReadonlyArray<string>, state.selectedOptions);
        } else {
            (cb as (
                value: string | null,
                option: SelectOption<TExtra> | null,
            ) => void)(state.value as string | null, state.selectedOption);
        }
    }, [currentKey, state.mode, state, ownerEcho]);
}
