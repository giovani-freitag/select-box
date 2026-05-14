import type {
    OptionFilterStrategy,
    SelectBoxController,
    SelectionValue,
} from "@select-box/core";
import { useEffect } from "react";

/**
 * Calls `controller.setFilter(filter)` whenever the prop reference changes;
 * leaves the controller's default filter alone when `filter` is undefined.
 */
export function useFilterReactivity<TExtra extends object>(
    controller: SelectBoxController<TExtra, SelectionValue>,
    filter: OptionFilterStrategy<TExtra> | undefined,
): void {
    useEffect(() => {
        if (filter === undefined) return;
        controller.setFilter(filter);
    }, [controller, filter]);
}
