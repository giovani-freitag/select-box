import type { SelectBoxController, SelectionValue, SelectOption } from "@select-box/core";
import { useEffect, useRef } from "react";

/**
 * Swaps the controller's option list whenever the prop reference changes.
 *
 * Skips the first run: the controller was built with that same list, and calling
 * `setOptions` again would publish a redundant snapshot on mount.
 */
export function useOptionsReactivity<TExtra extends object>(
    controller: SelectBoxController<TExtra, SelectionValue>,
    options: ReadonlyArray<SelectOption<TExtra>> | undefined,
): void {
    const mounted = useRef(false);
    useEffect(() => {
        if (!mounted.current) {
            mounted.current = true;
            return;
        }
        controller.setOptions(options ?? []);
    }, [controller, options]);
}
