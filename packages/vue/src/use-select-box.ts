import {
    SelectBoxController,
    type MultiSelectBoxControllerConfig,
    type SelectBoxControllerConfig,
    type SelectBoxSnapshot,
    type SelectionValue,
    type SingleSelectBoxControllerConfig,
} from "@select-box/core";
import { onScopeDispose, shallowRef, type ShallowRef } from "vue";

export interface UseSelectBoxResult<
    TExtra extends object = object,
    TValue extends SelectionValue = string | null,
> {
    /** Live snapshot, replaced as the controller publishes new state. */
    readonly state: ShallowRef<SelectBoxSnapshot<TExtra, TValue>>;
    readonly controller: SelectBoxController<TExtra, TValue>;
}

/**
 * Vue 3 composable that owns a controller for the effect-scope lifetime and
 * exposes its snapshot as a `ShallowRef`. Defaults to single mode; pass
 * `mode: "multi"` for multi-select semantics — the snapshot's `value` type
 * narrows accordingly.
 */
export function useSelectBox<TExtra extends object = object>(
    config: SingleSelectBoxControllerConfig<TExtra> & { mode?: "single" },
): UseSelectBoxResult<TExtra, string | null>;
export function useSelectBox<TExtra extends object = object>(
    config: MultiSelectBoxControllerConfig<TExtra> & { mode: "multi" },
): UseSelectBoxResult<TExtra, ReadonlyArray<string>>;
export function useSelectBox<TExtra extends object = object>(
    config: SelectBoxControllerConfig<TExtra>,
): UseSelectBoxResult<TExtra, SelectionValue> {
    const controller = new SelectBoxController<TExtra, SelectionValue>(config);
    const state = shallowRef<SelectBoxSnapshot<TExtra, SelectionValue>>(controller.getState());

    const unsubscribe = controller.subscribe(() => {
        state.value = controller.getState();
    });

    onScopeDispose(() => {
        unsubscribe();
        controller.destroy();
    });

    return { state, controller };
}
