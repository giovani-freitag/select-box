<script setup lang="ts" generic="TExtra extends object = object">
import {
    optionElementId,
    SelectBoxSnapshotView,
    TextHighlighter,
    type HighlightChunk,
    type SelectBoxController,
    type SelectBoxSnapshot,
    type SelectionValue,
    type SelectOption,
} from "@select-box/core";
import FormMirror from "./FormMirror.vue";
import { computed, useId, useTemplateRef } from "vue";

import { useClickOutsideClose } from "./composables/use-click-outside-close.js";
import { useSelectBoxKeyDispatcher } from "./composables/use-select-box-key-dispatcher.js";
import { useSelectBoxVirtualizer } from "./composables/use-select-box-virtualizer.js";

const ESTIMATED_OPTION_HEIGHT = 36;
const ESTIMATED_HEADER_HEIGHT = 28;
const LIST_VIEWPORT_HEIGHT = 240;

const props = defineProps<{
    state: SelectBoxSnapshot<TExtra, SelectionValue>;
    controller: SelectBoxController<TExtra, SelectionValue>;
    placeholder: string | undefined;
    name: string | undefined;
    required: boolean | undefined;
    ariaLabelText: string | undefined;
    ariaLabelledbyRef: string | undefined;
}>();

const instanceId = useId();
// The combobox points at the highlighted row by id; both sides derive it from
// the same snapshot rather than passing an index between components.
const activeDescendant = computed(() =>
    props.state.activeOption === null
        ? undefined
        : optionElementId(instanceId, props.state.activeOption.value),
);

const rootRef = useTemplateRef<HTMLDivElement>("rootEl");

defineExpose({ root: rootRef });
const inputRef = useTemplateRef<HTMLInputElement>("inputEl");

const keyDispatcher = useSelectBoxKeyDispatcher(props.controller);
const isOpen = computed(() => props.state.open);
useClickOutsideClose(rootRef, isOpen, props.controller);

const isMulti = computed(() => props.state.mode === "multi");
const view = computed(
    () => new SelectBoxSnapshotView<TExtra, SelectionValue>(props.state),
);
const inputValue = computed(() => view.value.triggerInputValue);
const hasSelection = computed(() => props.state.selectedOptions.length > 0);
const clearControl = computed(() => view.value.clearControl);
const removeControl = computed(() => view.value.removeControl);
const placeholderText = computed(() => {
    if (isMulti.value) {
        return hasSelection.value ? "" : (props.placeholder ?? "Select…");
    }
    return props.state.open && props.state.selectedOption
        ? props.state.selectedOption.label
        : (props.placeholder ?? "Select…");
});

const filteredGroups = computed(() => props.state.filteredGroups);
const activeIndex = computed(() => props.state.activeIndex);

const {
    rowModel,
    virtualItems,
    paddingTop,
    paddingBottom,
    activeRowIndex,
    measureRow,
} = useSelectBoxVirtualizer<TExtra>({
    groups: filteredGroups,
    activeIndex,
    viewportHeight: LIST_VIEWPORT_HEIGHT,
    estimateHeader: ESTIMATED_HEADER_HEIGHT,
    estimateOption: ESTIMATED_OPTION_HEIGHT,
    listRefName: "listEl",
});

const visibleEntries = computed(() => {
    const model = rowModel.value;
    const active = activeRowIndex.value;
    const currentView = view.value;
    return virtualItems.value.flatMap((virtualRow) => {
        const row = model.getRowAt(virtualRow.index);
        if (row === undefined) return [];
        return [
            {
                virtualRow,
                row,
                isActive: virtualRow.index === active,
                isSelected:
                    row.kind === "option" && currentView.isSelected(row.option.value),
            },
        ];
    });
});

function focusInput(): void {
    inputRef.value?.focus({ preventScroll: true });
}

function handleControlMouseDown(event: MouseEvent): void {
    if (event.target !== inputRef.value) event.preventDefault();
    if (!props.state.open) props.controller.open();
    focusInput();
}

function handleInput(event: Event): void {
    if (!props.state.open) props.controller.open();
    props.controller.setQuery((event.target as HTMLInputElement).value);
}

function handleInputFocus(): void {
    if (!props.state.open) props.controller.open();
}

function handleInputClick(): void {
    if (!props.state.open) props.controller.open();
}

function handleCaretClick(): void {
    if (props.state.open) {
        props.controller.close();
    } else {
        props.controller.open();
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
    props.controller.commitOption(option);
    focusInput();
}

function handleClearAll(event: MouseEvent): void {
    event.stopPropagation();
    props.controller.clear();
    focusInput();
}

function commitFromList(option: SelectOption<TExtra>): void {
    props.controller.commitOption(option);
    if (isMulti.value) focusInput();
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
    return TextHighlighter.split(label, props.state.highlightRanges(label));
}
</script>

<template>
    <div
        ref="rootEl"
        :class="['select-box', isMulti ? 'select-box-multi' : null].filter(Boolean).join(' ')"
        data-select-root
        :data-select-mode="isMulti ? 'multi' : 'single'"
    >
        <FormMirror :state="state" :controller="controller" :name="name" :required="required" />
        <!-- Multi-mode trigger: chips inside the input, click anywhere opens -->
        <div
            v-if="isMulti"
            class="select-box-trigger"
            data-select-trigger
            role="combobox"
            :aria-label="ariaLabelText"
            :aria-labelledby="ariaLabelledbyRef"
                :aria-activedescendant="activeDescendant"
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
                        :aria-label="removeControl.ariaLabelFor(option.label)"
                        data-select-chip-remove
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
                    :disabled="state.disabled"
                    :readonly="state.readOnly"
                    :aria-readonly="state.readOnly || undefined"
                    data-select-input
                    @input="handleInput"
                    @focus="handleInputFocus"
                    @keydown="handleKeyDown"
                />
            </div>
            <button
                v-if="clearControl.visible"
                type="button"
                class="select-box-clear"
                :aria-label="clearControl.ariaLabel"
                tabindex="-1"
                data-select-clear
                @mousedown.stop
                @click="handleClearAll"
            >{{ clearControl.label }}</button>
        </div>

        <!-- Single-mode trigger: plain input + caret button -->
        <div v-else class="select-box-trigger" data-select-trigger>
            <input
                ref="inputEl"
                type="text"
                class="select-box-input"
                role="combobox"
                :aria-label="ariaLabelText"
                :aria-labelledby="ariaLabelledbyRef"
                :aria-activedescendant="activeDescendant"
                aria-haspopup="listbox"
                aria-autocomplete="list"
                :aria-expanded="state.open"
                :placeholder="placeholderText"
                :value="inputValue"
                :disabled="state.disabled"
                :readonly="state.readOnly"
                :aria-readonly="state.readOnly || undefined"
                data-select-input
                @input="handleInput"
                @focus="handleInputFocus"
                @click="handleInputClick"
                @keydown="handleKeyDown"
            />
            <button
                type="button"
                class="select-box-caret"
                data-select-caret
                tabindex="-1"
                aria-hidden="true"
                @mousedown.prevent
                @click="handleCaretClick"
            >▾</button>
            <button
                v-if="clearControl.visible"
                type="button"
                class="select-box-clear"
                :aria-label="clearControl.ariaLabel"
                tabindex="-1"
                data-select-clear
                @mousedown.stop
                @click="handleClearAll"
            >{{ clearControl.label }}</button>
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
                            :aria-disabled="entry.row.option.disabled ? 'true' : undefined"
                            tabindex="-1"
                            :id="optionElementId(instanceId, entry.row.option.value)"
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
