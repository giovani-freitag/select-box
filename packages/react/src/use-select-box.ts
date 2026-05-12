import { SingleSelectBoxController, type SelectBoxSnapshot, type SingleSelectBoxConfig } from "@select-box/core";
import { useCallback, useState, useSyncExternalStore } from "react";

export interface UseSelectBoxResult<TExtra extends object = object> {
    readonly state: SelectBoxSnapshot<TExtra>;
    readonly controller: SingleSelectBoxController<TExtra>;
}

/**
 * React hook owning a controller for the component's lifetime; config is read on first render only.
 */
export function useSelectBox<TExtra extends object = object>(
    config: SingleSelectBoxConfig<TExtra>,
): UseSelectBoxResult<TExtra> {
    const [controller] = useState(() => new SingleSelectBoxController<TExtra>(config));

    const subscribe = useCallback(
        (listener: () => void) => controller.subscribe(listener),
        [controller],
    );

    const getSnapshot = useCallback(() => controller.getState(), [controller]);

    const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

    return { state, controller };
}
