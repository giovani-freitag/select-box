import type { SelectBoxController, SelectionValue } from "@select-box/core";
import { onBeforeUnmount, onMounted, type Ref } from "vue";

/**
 * Closes the controller when a `mousedown` lands outside `rootRef`. Listener
 * is registered on mount and torn down before unmount, mirroring the React
 * `useClickOutsideClose` lifecycle.
 */
export function useClickOutsideClose(
    rootRef: Readonly<Ref<HTMLElement | null>>,
    isOpen: Readonly<Ref<boolean>>,
    controller: SelectBoxController<object, SelectionValue>,
): void {
    function handleMouseDown(event: MouseEvent): void {
        if (!isOpen.value) return;
        if (!(event.target instanceof Node)) return;
        if (rootRef.value?.contains(event.target)) return;
        controller.close();
    }

    onMounted(() => {
        document.addEventListener("mousedown", handleMouseDown);
    });
    onBeforeUnmount(() => {
        document.removeEventListener("mousedown", handleMouseDown);
    });
}
