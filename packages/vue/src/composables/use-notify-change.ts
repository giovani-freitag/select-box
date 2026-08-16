import {
    SelectBoxSnapshotView,
    type SelectBoxSnapshot,
    type SelectionValue,
    type SelectOption,
} from "@select-box/core";
import { watch, type Ref } from "vue";

export interface NotifyChangeHandlers<TExtra extends object> {
    readonly single?: (
        value: string | null,
        option: SelectOption<TExtra> | null,
    ) => void;
    readonly multi?: (
        values: ReadonlyArray<string>,
        options: ReadonlyArray<SelectOption<TExtra>>,
    ) => void;
}

/**
 * Mode-aware change notifier. Fires the matching handler whenever the
 * committed value content changes (compared via `valueKey`). Mirrors the
 * React `useNotifyChange` hook; the consumer passes thin wrappers around its
 * `emit` calls so the composable stays agnostic of Vue's component identity.
 */
export function useNotifyChange<TExtra extends object>(
    state: Readonly<Ref<SelectBoxSnapshot<TExtra, SelectionValue>>>,
    handlers: NotifyChangeHandlers<TExtra>,
): void {
    let previousValueKey = SelectBoxSnapshotView.valueKey(state.value.value);
    watch(
        () => state.value.value,
        (next) => {
            const nextKey = SelectBoxSnapshotView.valueKey(next);
            if (nextKey === previousValueKey) return;
            previousValueKey = nextKey;
            if (state.value.mode === "multi") {
                handlers.multi?.(
                    next as ReadonlyArray<string>,
                    state.value.selectedOptions,
                );
            } else {
                handlers.single?.(
                    next as string | null,
                    state.value.selectedOption,
                );
            }
        },
    );
}
