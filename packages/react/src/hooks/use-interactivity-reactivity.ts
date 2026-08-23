import type { SelectBoxController, SelectionValue } from "@select-box/core";
import { useEffect } from "react";

/**
 * Mirrors the `disabled` / `readOnly` props into the controller.
 *
 * The controller owns the refusal, so no handler in this package repeats the
 * check and none of them can forget it.
 */
export function useInteractivityReactivity<TExtra extends object>(
    controller: SelectBoxController<TExtra, SelectionValue>,
    disabled: boolean | undefined,
    readOnly: boolean | undefined,
): void {
    useEffect(() => {
        controller.setInteractivity({
            disabled: disabled === true,
            readOnly: readOnly === true,
        });
    }, [controller, disabled, readOnly]);
}
