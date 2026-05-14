<script setup lang="ts" generic="TExtra extends object = object">
import {
    SelectBoxKeyDispatcher,
    SelectBoxListVirtualizer,
    SelectBoxRowModel,
    SelectBoxSnapshotView,
    TextHighlighter,
    type HighlightChunk,
    type OptionFilterStrategy,
    type SelectBoxAddon,
    type SelectBoxController,
    type SelectBoxSnapshot,
    type SelectionValue,
    type SelectOption,
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
    type ShallowRef,
} from "vue";

import { useSelectBox } from "./use-select-box.js";

/** Rendering style. `"popover"` is the default combobox-with-dropdown surface;
 * `"inline"` renders every option as a toggleable chip with no popover, no
 * trigger input, and no search. Orthogonal to `multi` — both surfaces work in
 * single and multi modes. */
export type SelectBoxSurface = "popover" | "inline";

export interface SelectBoxProps<TExtra extends object = object> {
    options?: ReadonlyArray<SelectOption<TExtra>>;
    /** Single mode: `string | number | null`. Multi mode: `ReadonlyArray<string | number>`. */
    defaultValue?: string | number | null | ReadonlyArray<string | number>;
    placeholder?: string;
    ungroupedLabel?: string;
    addons?: ReadonlyArray<SelectBoxAddon<TExtra>>;
    filter?: OptionFilterStrategy<TExtra>;
    /** When `true`, switches to multi-select (chips inside the input, popover stays open on commit). */
    multi?: boolean;
    /** Surface style. Defaults to `"popover"`. */
    surface?: SelectBoxSurface;
}

const ESTIMATED_OPTION_HEIGHT = 36;
const ESTIMATED_HEADER_HEIGHT = 28;
const LIST_VIEWPORT_HEIGHT = 240;

const props = withDefaults(defineProps<SelectBoxProps<TExtra>>(), {
    defaultValue: null,
    multi: false,
    surface: "popover",
});

const isInline = computed(() => props.surface === "inline");
const emit = defineEmits<{
    /** Single-mode change. Fires only when `multi` is `false`. */
    (event: "change", value: string | null, option: SelectOption<TExtra> | null): void;
    /** Multi-mode change. Fires only when `multi` is `true`. */
    (
        event: "change-multi",
        values: ReadonlyArray<string>,
        options: ReadonlyArray<SelectOption<TExtra>>,
    ): void;
}>();

function commonConfig() {
    return {
        ...(props.options !== undefined ? { options: props.options } : {}),
        ...(props.addons !== undefined ? { addons: props.addons } : {}),
        ...(props.filter !== undefined ? { filter: props.filter } : {}),
        ...(props.ungroupedLabel !== undefined ? { ungroupedLabel: props.ungroupedLabel } : {}),
    };
}

// Branch at the call site so each useSelectBox call hits a specific overload
// at construction; thereafter the controller's mode can flip at runtime via
// setMode without recreating the controller (selection preserved across the
// flip via the driver's coerce step).
const useResult = props.multi
    ? useSelectBox<TExtra>({
        mode: "multi",
        ...commonConfig(),
        initialValue: Array.isArray(props.defaultValue)
            ? (props.defaultValue as ReadonlyArray<string | number>)
            : [],
    })
    : useSelectBox<TExtra>({
        ...commonConfig(),
        initialValue: Array.isArray(props.defaultValue)
            ? null
            : (props.defaultValue as string | number | null),
    });

const state = useResult.state as ShallowRef<SelectBoxSnapshot<TExtra, SelectionValue>>;
const controller = useResult.controller as SelectBoxController<TExtra, SelectionValue>;

const keyDispatcher = new SelectBoxKeyDispatcher(controller);

watch(
    () => props.multi,
    (multi) => {
        controller.setMode(multi ? "multi" : "single");
    },
);

const isMulti = computed(() => state.value.mode === "multi");

const rootRef = useTemplateRef<HTMLDivElement>("rootEl");
const inputRef = useTemplateRef<HTMLInputElement>("inputEl");
const listRef = useTemplateRef<HTMLDivElement>("listEl");

watch(
    () => props.filter,
    (filter) => {
        if (filter !== undefined) controller.setFilter(filter);
    },
);

let previousValueKey = SelectBoxSnapshotView.valueKey(state.value.value);
watch(
    () => state.value.value,
    (next) => {
        const nextKey = SelectBoxSnapshotView.valueKey(next);
        if (nextKey === previousValueKey) return;
        previousValueKey = nextKey;
        if (state.value.mode === "multi") {
            emit(
                "change-multi",
                next as ReadonlyArray<string>,
                state.value.selectedOptions,
            );
        } else {
            emit("change", next as string | null, state.value.selectedOption);
        }
    },
);

const view = computed(
    () => new SelectBoxSnapshotView<TExtra, SelectionValue>(state.value),
);

const inputValue = computed(() => view.value.triggerInputValue);

const placeholderText = computed(() => {
    if (isMulti.value) {
        return state.value.selectedOptions.length > 0 ? "" : (props.placeholder ?? "Select…");
    }
    return state.value.open && state.value.selectedOption
        ? state.value.selectedOption.label
        : (props.placeholder ?? "Select…");
});

const hasSelection = computed(() => state.value.selectedOptions.length > 0);

const rowModel = computed(
    () => new SelectBoxRowModel<TExtra>({ groups: state.value.filteredGroups }),
);

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
    const currentView = view.value;
    return virtualItems.value.flatMap((virtualRow) => {
        const row = model.getRowAt(virtualRow.index);
        if (row === undefined) return [];
        return [
            {
                virtualRow,
                row,
                isActive: virtualRow.index === activeIndex,
                isSelected:
                    row.kind === "option" && currentView.isSelected(row.option.value),
            },
        ];
    });
});

onMounted(() => {
    // Inline surface has no popover/list/keyboard, so the virtualizer and the
    // outside-click listener stay dormant — only the popover surface needs them.
    if (isInline.value) return;
    virtualizer.mount();
    document.addEventListener("mousedown", handleOutsideMouseDown);
});

onBeforeUnmount(() => {
    if (isInline.value) {
        unsubscribeFromVirtualizer();
        return;
    }
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

function focusInput(): void {
    inputRef.value?.focus({ preventScroll: true });
}

function handleControlMouseDown(event: MouseEvent): void {
    if (event.target !== inputRef.value) event.preventDefault();
    if (!state.value.open) controller.open();
    focusInput();
}

function handleInput(event: Event): void {
    if (!state.value.open) controller.open();
    controller.setQuery((event.target as HTMLInputElement).value);
}

function handleInputFocus(): void {
    if (!state.value.open) controller.open();
}

function handleInputClick(): void {
    if (!state.value.open) controller.open();
}

function handleCaretClick(): void {
    if (state.value.open) {
        controller.close();
    } else {
        controller.open();
        focusInput();
    }
}

function handleKeyDown(event: KeyboardEvent): void {
    if (keyDispatcher.dispatch(event.key) === "handled") {
        event.preventDefault();
    }
}

function handleChipRemove(option: SelectOption<TExtra>, event: MouseEvent): void {
    event.stopPropagation();
    controller.commitOption(option);
    focusInput();
}

function handleClearAll(event: MouseEvent): void {
    event.stopPropagation();
    controller.clear();
    focusInput();
}

function commitFromList(option: SelectOption<TExtra>): void {
    controller.commitOption(option);
    if (isMulti.value) focusInput();
}

function commitInlineChip(option: SelectOption<TExtra>): void {
    if (option.disabled) return;
    controller.commitOption(option);
}

function inlineChipClass(isSelected: boolean, disabled: boolean | undefined): string {
    return [
        "select-box-chip",
        "select-box-chip-selectable",
        isSelected ? "select-box-chip-selected" : null,
        disabled ? "select-box-chip-disabled" : null,
    ]
        .filter((value): value is string => value !== null)
        .join(" ");
}

function estimateRowSize(model: SelectBoxRowModel<TExtra>, index: number): number {
    return model.getRowAt(index)?.kind === "header"
        ? ESTIMATED_HEADER_HEIGHT
        : ESTIMATED_OPTION_HEIGHT;
}

function optionClasses(
    isActive: boolean,
    isSelected: boolean,
    disabled: boolean | undefined,
): string {
    return [
        "select-box-option",
        isActive ? "select-box-option-active" : null,
        isSelected && isMulti.value ? "select-box-option-selected" : null,
        disabled ? "select-box-option-disabled" : null,
    ]
        .filter((value): value is string => value !== null)
        .join(" ");
}

function labelChunks(label: string): ReadonlyArray<HighlightChunk> {
    return TextHighlighter.split(label, state.value.highlightRanges(label));
}
</script>

<template>
    <!-- Inline surface: every option is a toggleable chip; no popover, no
         trigger input. Single mode replaces on click; multi toggles. -->
    <div
        v-if="isInline"
        :class="[
            'select-box',
            'select-box-inline',
            isMulti ? 'select-box-multi' : null,
        ].filter(Boolean).join(' ')"
        role="listbox"
        :aria-multiselectable="isMulti ? true : undefined"
        data-select-root
        :data-select-mode="isMulti ? 'multi' : 'single'"
        data-select-surface="inline"
    >
        <template v-for="group in state.filteredGroups" :key="group.key">
            <div
                v-if="group.label"
                class="select-box-group-label"
                data-select-group-label
            >{{ group.label }}</div>
            <div class="select-box-tags" data-select-tags>
                <button
                    v-for="option in group.options"
                    :key="option.value"
                    type="button"
                    role="option"
                    :aria-selected="view.isSelected(option.value)"
                    :aria-pressed="view.isSelected(option.value)"
                    :disabled="option.disabled"
                    :class="inlineChipClass(view.isSelected(option.value), option.disabled)"
                    data-select-chip
                    data-select-option
                    :data-select-selected="view.isSelected(option.value) ? '' : undefined"
                    @click="commitInlineChip(option)"
                >{{ option.label }}</button>
            </div>
        </template>
    </div>

    <div
        v-else
        ref="rootEl"
        :class="['select-box', isMulti ? 'select-box-multi' : null].filter(Boolean).join(' ')"
        data-select-root
        :data-select-mode="isMulti ? 'multi' : 'single'"
    >
        <!-- Multi-mode trigger: chips inside the input, click anywhere opens -->
        <div
            v-if="isMulti"
            class="select-box-trigger"
            data-select-trigger
            role="combobox"
            aria-haspopup="listbox"
            :aria-expanded="state.open"
            @mousedown="handleControlMouseDown"
        >
            <div class="select-box-tags" data-select-tags>
                <span
                    v-for="option in state.selectedOptions"
                    :key="option.value"
                    class="select-box-chip"
                    data-select-chip
                >
                    {{ option.label }}
                    <button
                        type="button"
                        class="select-box-chip-remove"
                        :aria-label="`Remove ${option.label}`"
                        @mousedown.stop
                        @click="(event) => handleChipRemove(option, event)"
                    >×</button>
                </span>
                <input
                    ref="inputEl"
                    type="text"
                    class="select-box-input"
                    role="searchbox"
                    aria-autocomplete="list"
                    :placeholder="placeholderText"
                    :value="state.query"
                    data-select-input
                    @input="handleInput"
                    @focus="handleInputFocus"
                    @keydown="handleKeyDown"
                />
            </div>
            <button
                v-if="hasSelection"
                type="button"
                class="select-box-clear"
                aria-label="Clear all"
                tabindex="-1"
                data-select-clear
                @mousedown.stop
                @click="handleClearAll"
            >×</button>
        </div>

        <!-- Single-mode trigger: plain input + caret button -->
        <div v-else class="select-box-trigger" data-select-trigger>
            <input
                ref="inputEl"
                type="text"
                class="select-box-input"
                role="combobox"
                aria-haspopup="listbox"
                aria-autocomplete="list"
                :aria-expanded="state.open"
                :placeholder="placeholderText"
                :value="inputValue"
                data-select-input
                @input="handleInput"
                @focus="handleInputFocus"
                @click="handleInputClick"
                @keydown="handleKeyDown"
            />
            <button
                type="button"
                class="select-box-caret"
                tabindex="-1"
                aria-hidden="true"
                @mousedown.prevent
                @click="handleCaretClick"
            >▾</button>
        </div>

        <div
            v-if="state.open"
            class="select-box-popover"
            role="listbox"
            :aria-multiselectable="isMulti ? true : undefined"
            data-select-popover
        >
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
                            role="option"
                            :aria-selected="entry.isSelected"
                            :class="optionClasses(entry.isActive, entry.isSelected, entry.row.option.disabled)"
                            :disabled="entry.row.option.disabled"
                            data-select-option
                            :data-select-active="entry.isActive ? '' : undefined"
                            :data-select-selected="entry.isSelected ? '' : undefined"
                            @mousedown.prevent
                            @click="commitFromList(entry.row.option)"
                        >
                            <span
                                v-if="isMulti"
                                class="select-box-option-tick"
                                aria-hidden="true"
                            >{{ entry.isSelected ? "✓" : "" }}</span>
                            <template
                                v-for="(chunk, chunkIndex) in labelChunks(entry.row.option.label)"
                                :key="chunkIndex"
                            >
                                <mark v-if="chunk.matched" class="select-box-option-match">{{ chunk.text }}</mark>
                                <template v-else>{{ chunk.text }}</template>
                            </template>
                        </button>
                    </template>
                </div>
            </div>
        </div>
    </div>
</template>
