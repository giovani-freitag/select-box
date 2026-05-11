import { SingleSelectBoxController, type SelectBoxSnapshot, type SingleSelectBoxConfig } from "@select-box/core";
import { onScopeDispose, shallowRef, type ShallowRef } from "vue";

export interface UseSelectBoxResult<TValue> {
    /** Live snapshot, replaced as the controller publishes new state. */
    readonly state: ShallowRef<SelectBoxSnapshot<TValue>>;
    readonly controller: SingleSelectBoxController<TValue>;
}

/**
 * Vue 3 composable that owns a controller for the effect-scope lifetime and exposes its snapshot
 * as a `ShallowRef`.
 */
export function useSelectBox<TValue>(config: SingleSelectBoxConfig<TValue>): UseSelectBoxResult<TValue> {
    const controller = new SingleSelectBoxController<TValue>(config);
    const state = shallowRef<SelectBoxSnapshot<TValue>>(controller.getState());

    const unsubscribe = controller.subscribe(() => {
        state.value = controller.getState();
    });

    onScopeDispose(() => {
        unsubscribe();
        controller.destroy();
    });

    return { state, controller };
}
