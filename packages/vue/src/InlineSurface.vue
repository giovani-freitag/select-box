<script setup lang="ts" generic="TExtra extends object = object">
import {
    SelectBoxSnapshotView,
    type SelectBoxController,
    type SelectBoxSnapshot,
    type SelectionValue,
    type SelectOption,
} from "@select-box/core";
import { computed, useTemplateRef } from "vue";

const props = defineProps<{
    state: SelectBoxSnapshot<TExtra, SelectionValue>;
    controller: SelectBoxController<TExtra, SelectionValue>;
}>();

const rootRef = useTemplateRef<HTMLDivElement>("rootEl");

defineExpose({ root: rootRef });

const isMulti = computed(() => props.state.mode === "multi");
const view = computed(
    () => new SelectBoxSnapshotView<TExtra, SelectionValue>(props.state),
);

function commitInlineChip(option: SelectOption<TExtra>): void {
    if (option.disabled) return;
    props.controller.commitOption(option);
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
</script>

<template>
    <div
        ref="rootEl"
        :class="[
            'select-box',
            'select-box-inline',
            isMulti ? 'select-box-multi' : null,
        ].filter(Boolean).join(' ')"
        role="listbox"
        :aria-multiselectable="isMulti ? true : undefined"
        data-select-root
        :data-select-mode="state.mode"
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
</template>
