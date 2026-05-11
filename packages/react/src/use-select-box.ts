import { SingleSelectBoxController, type SelectBoxSnapshot, type SingleSelectBoxConfig } from "@select-box/core";
import { useCallback, useState, useSyncExternalStore } from "react";

export interface UseSelectBoxResult<TValue> {
    readonly state: SelectBoxSnapshot<TValue>;
    readonly controller: SingleSelectBoxController<TValue>;
}

/**
 * React hook owning a controller for the component's lifetime; config is read on first render only.
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
