import type { SelectBoxController, SelectionValue, SelectOption } from "@select-box/core";
import { watch, type Ref } from "vue";

/**
 * Swaps the controller's option list whenever the prop reference changes.
 *
 * Not immediate: the controller was built with that same list, so the first run
 * would publish a redundant snapshot.
 */
export function useOptionsReactivity<TExtra extends object>(
    controller: SelectBoxController<TExtra, SelectionValue>,
    options: Readonly<Ref<ReadonlyArray<SelectOption<TExtra>> | undefined>>,
): void {
    watch(options, (next) => {
        controller.setOptions(next ?? []);
    });
}
