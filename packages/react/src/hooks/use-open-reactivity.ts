import { useEffect, useRef } from "react";

/**
 * Reports each open/close transition to the consumer.
 *
 * Every other wrapper dispatches this as a real DOM event. React's synthetic
 * event system only routes a fixed set of names, so a custom event on a
 * component cannot be listened to without a `ref` — the callbacks are React's
 * only door to the same information.
 *
 * @param open - Whether the popover is currently open.
 * @param onOpen - Called on the transition into open.
 * @param onClose - Called on the transition out of it.
 */
export function useOpenReactivity(
    open: boolean,
    onOpen: (() => void) | undefined,
    onClose: (() => void) | undefined,
): void {
    const previous = useRef(open);

    useEffect(() => {
        if (previous.current === open) return;
        previous.current = open;
        if (open) onOpen?.();
        else onClose?.();
    });
}
