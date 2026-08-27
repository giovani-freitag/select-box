import { PopoverPlacementWatcher } from "@select-box/core";
import { useEffect, useRef, type RefObject } from "react";

/**
 * Keeps the open popover on whichever side of the trigger it fits.
 *
 * The effect runs after every commit, which is exactly when the popover has the
 * height the placement rule needs to measure.
 *
 * @param rootRef - Ref to the component root.
 * @param open - Whether the popover is currently on screen.
 */
export function usePopoverPlacement(
    rootRef: RefObject<HTMLElement | null>,
    open: boolean,
): void {
    const watcher = useRef<PopoverPlacementWatcher | null>(null);
    watcher.current ??= new PopoverPlacementWatcher({ getRoot: () => rootRef.current });

    useEffect(() => {
        watcher.current?.sync(open);
    });

    useEffect(() => {
        const current = watcher.current;
        return () => current?.dispose();
    }, []);
}
