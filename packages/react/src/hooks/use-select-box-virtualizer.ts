import {
    SelectBoxListVirtualizer,
    SelectBoxRowModel,
    type SelectGroup,
} from "@select-box/core";
import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    useSyncExternalStore,
    type RefObject,
} from "react";

export interface UseSelectBoxVirtualizerResult<TExtra extends object> {
    readonly listRef: RefObject<HTMLDivElement | null>;
    readonly rowModel: SelectBoxRowModel<TExtra>;
    readonly virtualItems: ReturnType<SelectBoxListVirtualizer["getVirtualItems"]>;
    readonly paddingTop: number;
    readonly paddingBottom: number;
    readonly activeRowIndex: number;
    readonly measureElement: (node: HTMLElement | null) => void;
}

/**
 * Drives the virtualized option list: builds the row model, owns the
 * virtualizer instance, syncs it on group changes, scrolls the active row
 * into view, and exposes the items + padding the caller renders.
 */
export function useSelectBoxVirtualizer<TExtra extends object>(input: {
    groups: ReadonlyArray<SelectGroup<TExtra>>;
    activeIndex: number;
    viewportHeight: number;
    estimateHeader: number;
    estimateOption: number;
}): UseSelectBoxVirtualizerResult<TExtra> {
    const { groups, activeIndex, viewportHeight, estimateHeader, estimateOption } = input;
    const listRef = useRef<HTMLDivElement>(null);

    const rowModel = useMemo(() => new SelectBoxRowModel<TExtra>({ groups }), [groups]);
    const rowModelRef = useRef(rowModel);
    rowModelRef.current = rowModel;

    const [virtualizer] = useState(
        () =>
            new SelectBoxListVirtualizer({
                getScrollElement: () => listRef.current,
                getCount: () => rowModelRef.current.length,
                estimateSize: (index) =>
                    rowModelRef.current.getRowAt(index)?.kind === "header"
                        ? estimateHeader
                        : estimateOption,
                initialViewportHeight: viewportHeight,
            }),
    );

    useEffect(() => {
        virtualizer.mount();
        return () => virtualizer.dispose();
    }, [virtualizer]);

    useEffect(() => {
        virtualizer.sync();
    }, [virtualizer, rowModel]);

    const subscribe = useCallback(
        (listener: () => void) => virtualizer.subscribe(listener),
        [virtualizer],
    );
    const getSnapshot = useCallback(() => virtualizer.getVirtualItems(), [virtualizer]);
    const virtualItems = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

    const totalSize = virtualizer.getTotalSize();
    const paddingTop = virtualItems[0]?.start ?? 0;
    const paddingBottom = totalSize - (virtualItems.at(-1)?.end ?? 0);

    const activeRowIndex = rowModel.findRowIndexForActiveIndex(activeIndex);

    useEffect(() => {
        if (activeRowIndex < 0) return;
        virtualizer.scrollToIndex(activeRowIndex, "auto");
    }, [virtualizer, activeRowIndex]);

    const measureElement = useCallback(
        (node: HTMLElement | null): void => {
            virtualizer.measureElement(node);
        },
        [virtualizer],
    );

    return {
        listRef,
        rowModel,
        virtualItems,
        paddingTop,
        paddingBottom: Math.max(0, paddingBottom),
        activeRowIndex,
        measureElement,
    };
}
