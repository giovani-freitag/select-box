import { PopoverPlacementWatcher } from "@select-box/core";
import { onUnmounted, watch, type Ref } from "vue";

/**
 * Keeps the open popover on whichever side of the trigger it fits.
 *
 * Watching post-flush is what makes the measurement meaningful: the popover has
 * to be on screen before its height says anything about where it belongs.
 *
 * @param getRoot - Resolves the component root, or null once it is gone.
 * @param open - Reactive open state.
 */
export function usePopoverPlacement(
    getRoot: () => HTMLElement | null,
    open: Readonly<Ref<boolean>>,
): void {
    const watcher = new PopoverPlacementWatcher({ getRoot });

    watch(open, (isOpen) => watcher.sync(isOpen), { flush: "post", immediate: true });

    onUnmounted(() => watcher.dispose());
}
