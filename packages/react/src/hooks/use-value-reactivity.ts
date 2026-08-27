import {
    SelectBoxSnapshotView,
    type SelectBoxController,
    type SelectionValue,
    type SelectionValueInput,
} from "@select-box/core";
import { useEffect, type RefObject } from "react";

/**
 * Holds the controller to the `value` prop, so the owner's word is the last one.
 *
 * Re-asserting on the published selection too is what makes the component
 * genuinely controlled: a pick the owner does not answer is pushed back to
 * whatever the prop still says. That push is recorded in `ownerEcho` so the
 * change notifier can tell it apart from a user gesture — without that, the
 * revert would announce itself, the owner would answer it, and the two would
 * trade updates until React gave up.
 *
 * @param controller - Controller driving this component.
 * @param value - The `value` prop, or `undefined` while uncontrolled.
 * @param committed - The selection currently published in the snapshot.
 * @param ownerEcho - Carries the key this hook last pushed, for the notifier to skip.
 */
export function useValueReactivity<TExtra extends object>(
    controller: SelectBoxController<TExtra, SelectionValue>,
    value: SelectionValueInput,
    committed: SelectionValue,
    ownerEcho: RefObject<string | null>,
): void {
    useEffect(() => {
        if (value === undefined) return;
        ownerEcho.current = SelectBoxSnapshotView.valueKey(value as SelectionValue);
        controller.setValue(value);
    }, [controller, value, committed, ownerEcho]);
}
