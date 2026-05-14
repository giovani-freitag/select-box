import {
    SelectBoxKeyDispatcher,
    SelectBoxListVirtualizer,
    SelectBoxRowModel,
    SelectBoxSnapshotView,
    type OptionFilterStrategy,
    type SelectBoxController,
    type SelectBoxSnapshot,
    type SelectGroup,
    type SelectionValue,
    type SelectOption,
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

/**
 * Owns a `SelectBoxKeyDispatcher` for the lifetime of the controller. The
 * caller routes its keydown handler through `dispatcher.dispatch(event.key)`.
 */
export function useSelectBoxKeyDispatcher<
    TExtra extends object,
    TValue extends SelectionValue,
>(controller: SelectBoxController<TExtra, TValue>): SelectBoxKeyDispatcher<TExtra, TValue> {
    return useMemo(() => new SelectBoxKeyDispatcher(controller), [controller]);
}

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

/**
 * Calls `controller.setFilter(filter)` whenever the prop reference changes;
 * leaves the controller's default filter alone when `filter` is undefined.
 */
export function useFilterReactivity<TExtra extends object>(
    controller: SelectBoxController<TExtra, SelectionValue>,
    filter: OptionFilterStrategy<TExtra> | undefined,
): void {
    useEffect(() => {
        if (filter === undefined) return;
        controller.setFilter(filter);
    }, [controller, filter]);
}

/**
 * Mode-aware change notifier. Fires the consumer's `onChange` whenever the
 * committed value content changes (compared via `valueKey`), dispatching with
 * the single-mode signature `(value, option)` or the multi-mode signature
 * `(values, options)` based on the snapshot's `mode` at fire time.
 */
export function useNotifyChange<TExtra extends object>(
    state: SelectBoxSnapshot<TExtra, SelectionValue>,
    onChange:
        | ((value: string | null, option: SelectOption<TExtra> | null) => void)
        | ((
              values: ReadonlyArray<string>,
              options: ReadonlyArray<SelectOption<TExtra>>,
          ) => void)
        | undefined,
): void {
    const callbackRef = useRef(onChange);
    callbackRef.current = onChange;

    const currentKey = SelectBoxSnapshotView.valueKey(state.value);
    const previousKeyRef = useRef(currentKey);

    useEffect(() => {
        if (currentKey === previousKeyRef.current) return;
        previousKeyRef.current = currentKey;
        const cb = callbackRef.current;
        if (cb === undefined) return;
        if (state.mode === "multi") {
            (cb as (
                values: ReadonlyArray<string>,
                options: ReadonlyArray<SelectOption<TExtra>>,
            ) => void)(state.value as ReadonlyArray<string>, state.selectedOptions);
        } else {
            (cb as (
                value: string | null,
                option: SelectOption<TExtra> | null,
            ) => void)(state.value as string | null, state.selectedOption);
        }
    }, [currentKey, state.mode, state]);
}

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
