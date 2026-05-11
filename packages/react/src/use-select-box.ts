import { SingleSelectBoxController, type SelectBoxSnapshot, type SingleSelectBoxConfig } from "@select-box/core";
import { useCallback, useState, useSyncExternalStore } from "react";

export interface UseSelectBoxResult<TValue> {
    readonly state: SelectBoxSnapshot<TValue>;
    readonly controller: SingleSelectBoxController<TValue>;
}

/**
 * React-side entry point for the select-box library. Owns a single
 * `SingleSelectBoxController` instance for the lifetime of the
 * component (the config is read only on first render — change options
 * by passing a new controller through your own state if you need it).
 *
 * Returns the live snapshot and the controller. Components dispatch
 * user interaction to the controller and read the snapshot fields
 * directly — same shape across every wrapper.
 */
export function useSelectBox<TValue>(config: SingleSelectBoxConfig<TValue>): UseSelectBoxResult<TValue> {
    const [controller] = useState(() => new SingleSelectBoxController<TValue>(config));

    const subscribe = useCallback(
        (listener: () => void) => controller.subscribe(listener),
        [controller],
    );

    const getSnapshot = useCallback(() => controller.getState(), [controller]);

    const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

    return { state, controller };
}
