import { SingleSelectBoxController, type SelectBoxSnapshot, type SingleSelectBoxConfig } from "@select-box/core";
import { onScopeDispose, shallowRef, type ShallowRef } from "vue";

export interface UseSelectBoxResult<TExtra extends object = object> {
    /** Live snapshot, replaced as the controller publishes new state. */
    readonly state: ShallowRef<SelectBoxSnapshot<TExtra>>;
    readonly controller: SingleSelectBoxController<TExtra>;
}

/**
 * Vue 3 composable that owns a controller for the effect-scope lifetime and exposes its snapshot
 * as a `ShallowRef`.
 */
export function useSelectBox<TExtra extends object = object>(
    config: SingleSelectBoxConfig<TExtra>,
): UseSelectBoxResult<TExtra> {
    const controller = new SingleSelectBoxController<TExtra>(config);
    const state = shallowRef<SelectBoxSnapshot<TExtra>>(controller.getState());

    const unsubscribe = controller.subscribe(() => {
        state.value = controller.getState();
    });

    onScopeDispose(() => {
        unsubscribe();
        controller.destroy();
    });

    return { state, controller };
}
