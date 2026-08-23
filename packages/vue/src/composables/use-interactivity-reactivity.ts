import type { SelectBoxController, SelectionValue } from "@select-box/core";
import { watch, type Ref } from "vue";

/**
 * Mirrors the `disabled` / `readOnly` props into the controller.
 *
 * The controller owns the refusal, so no handler in this package repeats the
 * check and none of them can forget it.
 */
export function useInteractivityReactivity<TExtra extends object>(
    controller: SelectBoxController<TExtra, SelectionValue>,
    disabled: Readonly<Ref<boolean | undefined>>,
    readOnly: Readonly<Ref<boolean | undefined>>,
): void {
    watch([disabled, readOnly], ([nextDisabled, nextReadOnly]) => {
        controller.setInteractivity({
            disabled: nextDisabled === true,
            readOnly: nextReadOnly === true,
        });
    });
}
