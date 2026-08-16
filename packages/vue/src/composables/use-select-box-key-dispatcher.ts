import {
    SelectBoxKeyDispatcher,
    type SelectBoxController,
    type SelectionValue,
} from "@select-box/core";

/**
 * Builds a `SelectBoxKeyDispatcher` for the given controller. Stateless per
 * controller — the dispatcher is just a stable wrapper around `controller`,
 * so we keep it as a plain function call instead of a reactive primitive.
 */
export function useSelectBoxKeyDispatcher<
    TExtra extends object,
    TValue extends SelectionValue,
>(controller: SelectBoxController<TExtra, TValue>): SelectBoxKeyDispatcher<TExtra, TValue> {
    return new SelectBoxKeyDispatcher(controller);
}
