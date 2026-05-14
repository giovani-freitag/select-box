import {
    SelectBoxKeyDispatcher,
    type SelectBoxController,
    type SelectionValue,
} from "@select-box/core";
import { useMemo } from "react";

/**
 * Owns a `SelectBoxKeyDispatcher` for the lifetime of the controller. The
 * caller routes its keydown handler through `dispatcher.dispatch(event.key)`.
 */
export function useSelectBoxKeyDispatcher<
    TExtra extends object,
    TValue extends SelectionValue,
>(controller: SelectBoxController<TExtra, TValue>): SelectBoxKeyDispatcher<TExtra, TValue> {
    return useMemo(() => new SelectBoxKeyDispatcher(controller), [controller]);
}
