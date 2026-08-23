import {
    SelectBoxController,
    type MultiSelectBoxControllerConfig,
    type SelectBoxControllerConfig,
    type SelectBoxSnapshot,
    type SelectionValue,
    type SingleSelectBoxControllerConfig,
} from "@select-box/core";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

export interface UseSelectBoxResult<
    TExtra extends object = object,
    TValue extends SelectionValue = string | null,
> {
    readonly state: SelectBoxSnapshot<TExtra, TValue>;
    readonly controller: SelectBoxController<TExtra, TValue>;
}

/**
 * React hook owning a controller for the component's lifetime; config is read
 * on first render only. Defaults to single mode; pass `mode: "multi"` for
 * multi-select semantics — the snapshot's `value` type narrows accordingly.
 */
/**
 * Detaches the controller's addons when the component really goes away.
 *
 * The check is deferred by a microtask on purpose. StrictMode mounts, unmounts
 * and remounts in the same commit while keeping the controller in state, so
 * destroying straight from the cleanup would leave the remounted component
 * holding a controller whose addons are already gone. A real unmount never
 * comes back, so by the microtask the flag is still down.
 */
function useControllerTeardown(controller: SelectBoxController<object, SelectionValue>): void {
    const mounted = useRef(false);
    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false;
            queueMicrotask(() => {
                if (!mounted.current) controller.destroy();
            });
        };
    }, [controller]);
}

export function useSelectBox<TExtra extends object = object>(
    config: SingleSelectBoxControllerConfig<TExtra> & { mode?: "single" },
): UseSelectBoxResult<TExtra, string | null>;
export function useSelectBox<TExtra extends object = object>(
    config: MultiSelectBoxControllerConfig<TExtra> & { mode: "multi" },
): UseSelectBoxResult<TExtra, ReadonlyArray<string>>;
export function useSelectBox<TExtra extends object = object>(
    config: SelectBoxControllerConfig<TExtra>,
): UseSelectBoxResult<TExtra, SelectionValue> {
    const [controller] = useState(
        () => new SelectBoxController<TExtra, SelectionValue>(config),
    );
    useControllerTeardown(controller);

    const subscribe = useCallback(
        (listener: () => void) => controller.subscribe(listener),
        [controller],
    );

    const getSnapshot = useCallback(() => controller.getState(), [controller]);

    const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

    return { state, controller };
}
