import {
    SelectBoxListVirtualizer,
    SelectBoxRowModel,
    type SelectGroup,
    type VirtualItem,
} from "@select-box/core";
import {
    computed,
    onBeforeUnmount,
    onMounted,
    onUpdated,
    shallowRef,
    useTemplateRef,
    watch,
    type ComputedRef,
    type Ref,
    type ShallowRef,
} from "vue";

export interface UseSelectBoxVirtualizerInput<TExtra extends object> {
    /** Reactive source of filtered groups; the row model rebuilds whenever this changes. */
    readonly groups: Readonly<Ref<ReadonlyArray<SelectGroup<TExtra>>>>;
    /** Reactive controller-driven active option index (post-filter). */
    readonly activeIndex: Readonly<Ref<number>>;
    readonly viewportHeight: number;
    readonly estimateHeader: number;
    readonly estimateOption: number;
    /** Template ref name to bind the list element to (must exist in the consumer template). */
    readonly listRefName: string;
}

export interface UseSelectBoxVirtualizerResult<TExtra extends object> {
    readonly listRef: Readonly<Ref<HTMLDivElement | null>>;
    readonly rowModel: ComputedRef<SelectBoxRowModel<TExtra>>;
    readonly virtualItems: ShallowRef<ReadonlyArray<VirtualItem>>;
    readonly paddingTop: ComputedRef<number>;
    readonly paddingBottom: ComputedRef<number>;
    readonly activeRowIndex: ComputedRef<number>;
    readonly measureRow: (node: unknown) => void;
}

/**
 * Drives the virtualized option list inside a popover surface: builds the row
 * model from the reactive `groups`, owns the virtualizer instance, syncs it
 * on updates, scrolls the active row into view, and exposes the items +
 * padding the caller renders. Mirrors React's `useSelectBoxVirtualizer`.
 */
export function useSelectBoxVirtualizer<TExtra extends object>(
    input: UseSelectBoxVirtualizerInput<TExtra>,
): UseSelectBoxVirtualizerResult<TExtra> {
    const listRef = useTemplateRef<HTMLDivElement>(input.listRefName);

    const rowModel = computed(
        () => new SelectBoxRowModel<TExtra>({ groups: input.groups.value }),
    );

    const virtualizer = new SelectBoxListVirtualizer({
        getScrollElement: () => listRef.value,
        getCount: () => rowModel.value.length,
        estimateSize: (index) =>
            rowModel.value.getRowAt(index)?.kind === "header"
                ? input.estimateHeader
                : input.estimateOption,
        initialViewportHeight: input.viewportHeight,
    });

    const virtualItems = shallowRef<ReadonlyArray<VirtualItem>>(
        virtualizer.getVirtualItems(),
    );
    const totalSize = shallowRef<number>(virtualizer.getTotalSize());
    const unsubscribe = virtualizer.subscribe(() => {
        virtualItems.value = virtualizer.getVirtualItems();
        totalSize.value = virtualizer.getTotalSize();
    });

    const paddingTop = computed(() => virtualItems.value[0]?.start ?? 0);
    const paddingBottom = computed(() =>
        Math.max(0, totalSize.value - (virtualItems.value.at(-1)?.end ?? 0)),
    );

    const activeRowIndex = computed(() =>
        rowModel.value.findRowIndexForActiveIndex(input.activeIndex.value),
    );

    onUpdated(() => {
        virtualizer.sync();
    });

    watch(activeRowIndex, (rowIndex) => {
        if (rowIndex < 0) return;
        virtualizer.scrollToIndex(rowIndex, "auto");
    });

    onMounted(() => {
        virtualizer.mount();
    });

    onBeforeUnmount(() => {
        unsubscribe();
        virtualizer.dispose();
    });

    function measureRow(node: unknown): void {
        if (node === null) {
            virtualizer.measureElement(null);
            return;
        }
        if (node instanceof HTMLElement) {
            virtualizer.measureElement(node);
        }
    }

    return {
        listRef,
        rowModel,
        virtualItems,
        paddingTop,
        paddingBottom,
        activeRowIndex,
        measureRow,
    };
}
