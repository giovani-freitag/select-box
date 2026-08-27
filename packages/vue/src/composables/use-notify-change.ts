import {
    SelectBoxSnapshotView,
    type SelectBoxSnapshot,
    type SelectionValue,
    type SelectOption,
} from "@select-box/core";
import { watch, type Ref } from "vue";

import type { OwnerEcho } from "./use-value-reactivity.js";

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
 *
 * A change the owner itself pushed in through `value` is swallowed rather than
 * announced: telling an owner what it just asked for is an echo, and answering
 * that echo is how a controlled component ends up in a loop.
 */
export function useNotifyChange<TExtra extends object>(
    state: Readonly<Ref<SelectBoxSnapshot<TExtra, SelectionValue>>>,
    handlers: NotifyChangeHandlers<TExtra>,
    ownerEcho?: OwnerEcho,
): void {
    let previousValueKey = SelectBoxSnapshotView.valueKey(state.value.value);
    watch(
        () => state.value.value,
        (next) => {
            const nextKey = SelectBoxSnapshotView.valueKey(next);
            if (nextKey === previousValueKey) return;
            previousValueKey = nextKey;

            const echoed = ownerEcho?.current === nextKey;
            if (ownerEcho) ownerEcho.current = null;
            if (echoed) return;

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
