import { SingleSelectBoxController, type SelectBoxSnapshot, type SingleSelectBoxConfig } from "@select-box/core";
import { onScopeDispose, shallowRef, type ShallowRef } from "vue";

export interface UseSelectBoxResult<TValue> {
    /** Live snapshot, replaced as the controller publishes new state. */
    readonly state: ShallowRef<SelectBoxSnapshot<TValue>>;
    readonly controller: SingleSelectBoxController<TValue>;
}

/**
 * Vue 3 composable counterpart of the React hook. Creates one controller
 * for the composable's effect-scope lifetime, subscribes via `shallowRef`
 * (snapshots are immutable so deep tracking is wasteful), and unsubscribes
 * + destroys on scope dispose.
 *
 * The returned `state` is a `ShallowRef` — components read `state.value`
 * to access snapshot fields. Reactivity tracks the reference, not nested
 * fields, which is the right granularity for our atomic-snapshot model.
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
