import { useCallback, type Ref, type RefObject } from "react";

/**
 * Fans one DOM node out to an internally owned ref and an optional caller ref.
 *
 * A surface needs the node for its own effects while consumers expect `ref` to
 * hand them the same element, and a JSX element accepts only one `ref`.
 */
export function useMergedRefs<TElement extends HTMLElement>(
    internalRef: RefObject<TElement | null>,
    externalRef: Ref<TElement> | undefined,
): (node: TElement | null) => void {
    return useCallback(
        (node: TElement | null) => {
            internalRef.current = node;
            if (typeof externalRef === "function") {
                externalRef(node);
                return;
            }
            if (externalRef) externalRef.current = node;
        },
        [internalRef, externalRef],
    );
}
