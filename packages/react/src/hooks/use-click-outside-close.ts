import type { SelectBoxController, SelectionValue } from "@select-box/core";
import { useEffect, type RefObject } from "react";

/**
 * Closes the controller when a mousedown lands outside `rootRef`. No-op when
 * the popover is already closed.
 */
export function useClickOutsideClose(
    rootRef: RefObject<HTMLElement | null>,
    isOpen: boolean,
    controller: SelectBoxController<object, SelectionValue>,
): void {
    useEffect(() => {
        if (!isOpen) return;
        function handleMouseDown(event: MouseEvent): void {
            if (!(event.target instanceof Node)) return;
            if (rootRef.current?.contains(event.target)) return;
            controller.close();
        }
        document.addEventListener("mousedown", handleMouseDown);
        return () => {
            document.removeEventListener("mousedown", handleMouseDown);
        };
    }, [isOpen, controller, rootRef]);
}
