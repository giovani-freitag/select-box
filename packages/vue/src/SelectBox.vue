<script setup lang="ts" generic="TExtra extends object = object">
import {
    SelectBoxListVirtualizer,
    SelectBoxRowModel,
    type OptionFilterStrategy,
    type SelectBoxAddon,
    type SelectOption,
    type VirtualItem,
} from "@select-box/core";
import {
    computed,
    nextTick,
    onBeforeUnmount,
    onMounted,
    onUpdated,
    shallowRef,
    useTemplateRef,
    watch,
} from "vue";

import { useSelectBox } from "./use-select-box.js";

export interface SelectBoxProps<TExtra extends object = object> {
    options?: ReadonlyArray<SelectOption<TExtra>>;
    defaultValue?: string | number | null;
    placeholder?: string;
    ungroupedLabel?: string;
    addons?: ReadonlyArray<SelectBoxAddon<TExtra>>;
    filter?: OptionFilterStrategy<TExtra>;
}

const ESTIMATED_OPTION_HEIGHT = 36;
const ESTIMATED_HEADER_HEIGHT = 28;
const LIST_VIEWPORT_HEIGHT = 240;

const props = withDefaults(defineProps<SelectBoxProps<TExtra>>(), { defaultValue: null });
const emit = defineEmits<{
    (event: "change", value: string | null, option: SelectOption<TExtra> | null): void;
}>();

const { state, controller } = useSelectBox<TExtra>({
    ...(props.options !== undefined ? { options: props.options } : {}),
    ...(props.addons !== undefined ? { addons: props.addons } : {}),
    ...(props.filter !== undefined ? { filter: props.filter } : {}),
    ...(props.ungroupedLabel !== undefined ? { ungroupedLabel: props.ungroupedLabel } : {}),
    initialValue: props.defaultValue,
});

const rootRef = useTemplateRef<HTMLDivElement>("rootEl");
const searchRef = useTemplateRef<HTMLInputElement>("searchEl");
const listRef = useTemplateRef<HTMLDivElement>("listEl");

watch(
    () => props.filter,
    (filter) => {
        if (filter !== undefined) controller.setFilter(filter);
    },
);

watch(
    () => state.value.open,
    async (isOpen) => {
        if (!isOpen) return;
        await nextTick();
        searchRef.value?.focus({ preventScroll: true });
    },
);

let previousValue: string | null = state.value.value;
watch(
    () => state.value.value,
    (next) => {
        if (next === previousValue) return;
        previousValue = next;
        emit("change", next, state.value.selectedOption);
    },
);

const rowModel = computed(() => new SelectBoxRowModel<TExtra>(state.value.filteredGroups));

const virtualizer = new SelectBoxListVirtualizer({
    getScrollElement: () => listRef.value,
    getCount: () => rowModel.value.length,
    estimateSize: (index) => estimateRowSize(rowModel.value, index),
    initialViewportHeight: LIST_VIEWPORT_HEIGHT,
});

const virtualItems = shallowRef<ReadonlyArray<VirtualItem>>(virtualizer.getVirtualItems());
const totalSize = shallowRef<number>(virtualizer.getTotalSize());
const unsubscribeFromVirtualizer = virtualizer.subscribe(() => {
    virtualItems.value = virtualizer.getVirtualItems();
    totalSize.value = virtualizer.getTotalSize();
});

const paddingTop = computed(() => virtualItems.value[0]?.start ?? 0);
const paddingBottom = computed(() =>
    Math.max(0, totalSize.value - (virtualItems.value.at(-1)?.end ?? 0)),
);

// `onUpdated` fires after the template commits, so listRef.value is guaranteed
// populated before sync() re-resolves the scroll element. A pre-flush watch
// would run with listRef still null and TanStack would never attach observers,
// leaving the popover frozen at the first scroll fold.
onUpdated(() => {
    virtualizer.sync();
});

const activeRowIndex = computed(() =>
    rowModel.value.findRowIndexForActiveIndex(state.value.activeIndex),
);

watch(activeRowIndex, (rowIndex) => {
    if (rowIndex < 0) return;
    virtualizer.scrollToIndex(rowIndex, "auto");
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

const visibleEntries = computed(() => {
    const model = rowModel.value;
    const activeIndex = activeRowIndex.value;
    return virtualItems.value.flatMap((virtualRow) => {
        const row = model.getRowAt(virtualRow.index);
        if (row === undefined) return [];
        return [{
            virtualRow,
            row,
            isActive: virtualRow.index === activeIndex,
        }];
    });
});

onMounted(() => {
    virtualizer.mount();
    document.addEventListener("mousedown", handleOutsideMouseDown);
});

onBeforeUnmount(() => {
    document.removeEventListener("mousedown", handleOutsideMouseDown);
    unsubscribeFromVirtualizer();
    virtualizer.dispose();
});

function handleOutsideMouseDown(event: MouseEvent): void {
    if (!state.value.open) return;
    if (!(event.target instanceof Node)) return;
    if (rootRef.value?.contains(event.target)) return;
    controller.close();
}

function handleKeyDown(event: KeyboardEvent): void {
    if (event.key === "ArrowDown") {
        event.preventDefault();
        if (!state.value.open) controller.open();
        else controller.moveActive(1);
        return;
    }
    if (event.key === "ArrowUp") {
        event.preventDefault();
        controller.moveActive(-1);
        return;
    }
    if (event.key === "Enter") {
        event.preventDefault();
        controller.commitActive();
        return;
    }
    if (event.key === "Escape") {
        event.preventDefault();
        controller.close();
    }
}

function estimateRowSize(model: SelectBoxRowModel<TExtra>, index: number): number {
    return model.getRowAt(index)?.kind === "header"
        ? ESTIMATED_HEADER_HEIGHT
        : ESTIMATED_OPTION_HEIGHT;
}

function optionClasses(option: SelectOption<TExtra>, isActive: boolean): string {
    return [
        "select-box-option",
        isActive ? "select-box-option-active" : null,
        option.disabled ? "select-box-option-disabled" : null,
    ]
        .filter((value): value is string => value !== null)
        .join(" ");
}
</script>

<template>
    <div ref="rootEl" class="select-box" data-select-root>
        <button
            type="button"
            class="select-box-trigger"
            :aria-expanded="state.open"
            aria-haspopup="listbox"
            data-select-trigger
            @click="controller.toggle()"
        >
            <span
                :class="state.selectedOption ? 'select-box-value' : 'select-box-value select-box-placeholder'"
            >
                {{ state.selectedOption?.label ?? placeholder ?? "Select…" }}
            </span>
            <span class="select-box-caret" aria-hidden="true">▾</span>
        </button>

        <div
            v-if="state.open"
            class="select-box-popover"
            role="listbox"
            data-select-popover
        >
            <input
                ref="searchEl"
                class="select-box-search"
                type="text"
                :placeholder="placeholder ?? 'Search…'"
                :value="state.query"
                data-select-search
                @input="controller.setQuery(($event.target as HTMLInputElement).value)"
                @keydown="handleKeyDown"
            />
            <div
                ref="listEl"
                class="select-box-list"
                data-select-list
                :style="{ maxHeight: `${LIST_VIEWPORT_HEIGHT}px`, overflowY: 'auto' }"
            >
                <p v-if="state.isEmpty" class="select-box-empty" data-select-empty>No matches</p>
                <div
                    v-else
                    :style="{
                        paddingTop: `${paddingTop}px`,
                        paddingBottom: `${paddingBottom}px`,
                    }"
                >
                    <template v-for="entry in visibleEntries" :key="entry.virtualRow.index">
                        <div
                            v-if="entry.row.kind === 'header'"
                            :ref="measureRow"
                            :data-index="entry.virtualRow.index"
                            class="select-box-group-label"
                            data-select-group-label
                        >
                            {{ entry.row.group.label }}
                        </div>
                        <button
                            v-else
                            :ref="measureRow"
                            :data-index="entry.virtualRow.index"
                            type="button"
                            :class="optionClasses(entry.row.option, entry.isActive)"
                            :disabled="entry.row.option.disabled"
                            data-select-option
                            :data-select-active="entry.isActive ? '' : undefined"
                            @mousedown.prevent
                            @click="controller.commitOption(entry.row.option)"
                        >
                            {{ entry.row.option.label }}
                        </button>
                    </template>
                </div>
            </div>
        </div>
    </div>
</template>
