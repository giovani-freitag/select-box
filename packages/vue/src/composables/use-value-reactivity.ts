import {
    SelectBoxSnapshotView,
    type SelectBoxController,
    type SelectBoxSnapshot,
    type SelectionValue,
    type SelectionValueInput,
} from "@select-box/core";
import { watch, type Ref } from "vue";

/** Carries the key the owner last pushed, so the notifier can skip its echo. */
export interface OwnerEcho {
    current: string | null;
}

/**
 * Holds the controller to the `value` prop, so the owner's word is the last one.
 *
 * Watching the published selection as well as the prop is what makes the
 * component genuinely controlled: a pick the owner does not answer is pushed
 * back to whatever the prop still says. That push is recorded in `ownerEcho` so
 * the change notifier can tell it apart from a user gesture — otherwise the
 * revert would announce itself and the two would trade updates forever.
 *
 * Register this **after** the notifier: watchers run in creation order, and a
 * value pushed before the announcement would stamp the wrong key on it.
 *
 * @param controller - Controller driving this component.
 * @param value - Reactive `value` prop, `undefined` while uncontrolled.
 * @param state - The component's live snapshot.
 * @param ownerEcho - Shared with the notifier, carrying what this pushed.
 */
export function useValueReactivity<TExtra extends object>(
    controller: SelectBoxController<TExtra, SelectionValue>,
    value: Readonly<Ref<SelectionValueInput>>,
    state: Readonly<Ref<SelectBoxSnapshot<TExtra, SelectionValue>>>,
    ownerEcho: OwnerEcho,
): void {
    watch(
        [value, () => state.value.value],
        () => {
            const next = value.value;
            if (next === undefined) return;
            ownerEcho.current = SelectBoxSnapshotView.valueKey(next as SelectionValue);
            controller.setValue(next);
        },
        { immediate: true },
    );
}
