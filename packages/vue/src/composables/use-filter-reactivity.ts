import type {
    OptionFilterStrategy,
    SelectBoxController,
    SelectionValue,
} from "@select-box/core";
import { watch, type Ref } from "vue";

/**
 * Calls `controller.setFilter(filter)` whenever the prop reference changes;
 * leaves the controller's default filter alone when `filter` is undefined.
 */
export function useFilterReactivity<TExtra extends object>(
    controller: SelectBoxController<TExtra, SelectionValue>,
    filter: Readonly<Ref<OptionFilterStrategy<TExtra> | undefined>>,
): void {
    watch(filter, (next) => {
        if (next === undefined) return;
        controller.setFilter(next);
    });
}
