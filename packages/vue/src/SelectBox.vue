<script setup lang="ts" generic="TExtra extends object = object">
import {
    ListVirtualizer,
    SelectBoxRowModel,
    type OptionFilterStrategy,
    type SelectBoxAddon,
    type SelectGroup,
    type SelectOption,
    type VirtualRange,
} from "@select-box/core";
import {
    computed,
    nextTick,
    onBeforeUnmount,
    onMounted,
    shallowRef,
    useTemplateRef,
    watch,
} from "vue";

import { useSelectBox } from "./use-select-box.js";

export interface SelectBoxProps<TExtra extends object = object> {
    options?: ReadonlyArray<SelectOption<TExtra>>;
    groups?: ReadonlyArray<SelectGroup<TExtra>>;
    defaultValue?: string | number | null;
    placeholder?: string;
    ungroupedLabel?: string;
    addons?: ReadonlyArray<SelectBoxAddon<TExtra>>;
    filter?: OptionFilterStrategy<TExtra>;
}

const OPTION_ROW_HEIGHT = 36;
const HEADER_ROW_HEIGHT = 28;
const LIST_VIEWPORT_HEIGHT = 240;

const props = withDefaults(defineProps<SelectBoxProps<TExtra>>(), { defaultValue: null });
const emit = defineEmits<{
    (event: "change", value: string | null, option: SelectOption<TExtra> | null): void;
}>();

const { state, controller } = useSelectBox<TExtra>({
    ...(props.options !== undefined ? { options: props.options } : {}),
    ...(props.groups !== undefined ? { groups: props.groups } : {}),
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

function rowHeightFn(index: number): number {
    return rowHeightAt(rowModel.value, index);
}

const virtualizer = new ListVirtualizer({
    rowCount: rowModel.value.length,
    rowHeight: rowHeightFn,
    viewportHeight: LIST_VIEWPORT_HEIGHT,
});

const range = shallowRef<VirtualRange>(virtualizer.getRange());
const unsubscribeFromVirtualizer = virtualizer.subscribe(() => {
    range.value = virtualizer.getRange();
});

watch(rowModel, (model) => {
    virtualizer.setRowCount(model.length);
});

const activeRowIndex = computed(() =>
    rowModel.value.findRowIndexForActiveIndex(state.value.activeIndex),
);

watch(activeRowIndex, (rowIndex) => {
    const list = listRef.value;
    if (list === null || rowIndex < 0) return;
    const targetOffset = virtualizer.getOffset(rowIndex);
    const targetHeight = rowHeightAt(rowModel.value, rowIndex);
    const viewportTop = list.scrollTop;
    const viewportBottom = viewportTop + list.clientHeight;
    if (targetOffset < viewportTop) {
        list.scrollTop = targetOffset;
        return;
    }
    if (targetOffset + targetHeight > viewportBottom) {
        list.scrollTop = targetOffset + targetHeight - list.clientHeight;
    }
});

const visibleEntries = computed(() => {
    const model = rowModel.value;
    const activeIndex = activeRowIndex.value;
    return range.value.visibleRows.flatMap((virtualRow) => {
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
    listRef.value?.addEventListener("scroll", handleListScroll, { passive: true });
    document.addEventListener("mousedown", handleOutsideMouseDown);
});

onBeforeUnmount(() => {
    listRef.value?.removeEventListener("scroll", handleListScroll);
    document.removeEventListener("mousedown", handleOutsideMouseDown);
    unsubscribeFromVirtualizer();
});

function handleListScroll(): void {
    const list = listRef.value;
    if (list === null) return;
    virtualizer.setScrollOffset(list.scrollTop);
}

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

function rowHeightAt(model: SelectBoxRowModel<TExtra>, index: number): number {
    return model.getRowAt(index)?.kind === "header" ? HEADER_ROW_HEIGHT : OPTION_ROW_HEIGHT;
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
                        paddingTop: `${range.paddingTop}px`,
                        paddingBottom: `${range.paddingBottom}px`,
                    }"
                >
                    <template v-for="entry in visibleEntries" :key="entry.virtualRow.index">
                        <div
                            v-if="entry.row.kind === 'header'"
                            class="select-box-group-label"
                            data-select-group-label
                            :style="{ height: `${HEADER_ROW_HEIGHT}px` }"
                        >
                            {{ entry.row.group.label }}
                        </div>
                        <button
                            v-else
                            type="button"
                            :class="optionClasses(entry.row.option, entry.isActive)"
                            :disabled="entry.row.option.disabled"
                            data-select-option
                            :data-select-active="entry.isActive ? '' : undefined"
                            :style="{ height: `${OPTION_ROW_HEIGHT}px` }"
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
