<script setup lang="ts" generic="TExtra extends object = object">
import {
    SelectBoxSnapshotView,
    type SelectBoxController,
    type SelectBoxSnapshot,
    type SelectionValue,
    type SelectOption,
} from "@select-box/core";
import FormMirror from "./FormMirror.vue";
import { computed, useTemplateRef } from "vue";

const props = defineProps<{
    state: SelectBoxSnapshot<TExtra, SelectionValue>;
    controller: SelectBoxController<TExtra, SelectionValue>;
    name: string | undefined;
    required: boolean | undefined;
    ariaLabelText: string | undefined;
    ariaLabelledbyRef: string | undefined;
}>();

const rootRef = useTemplateRef<HTMLDivElement>("rootEl");

defineExpose({ root: rootRef });

const isMulti = computed(() => props.state.mode === "multi");
const view = computed(
    () => new SelectBoxSnapshotView<TExtra, SelectionValue>(props.state),
);

function commitInlineChip(option: SelectOption<TExtra>): void {
    // The chips carry `aria-disabled` rather than the native attribute, so
    // refusing the click is this handler's job now.
    if (option.disabled === true || props.state.disabled || props.state.readOnly) return;
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
        :class="['select-box', isMulti ? 'select-box-multi' : null].filter(Boolean).join(' ')"
        data-select-root
        :data-select-mode="state.mode"
    >
        <FormMirror :state="state" :controller="controller" :name="name" :required="required" />
        <!-- The surface is a child of the root in every wrapper, so the root
             never doubles as a listbox and one selector addresses either. -->
        <div
            class="select-box-inline"
            role="listbox"
            :aria-multiselectable="isMulti ? true : undefined"
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
                    :aria-disabled="option.disabled === true || state.disabled || state.readOnly ? 'true' : undefined"
                    :class="inlineChipClass(view.isSelected(option.value), option.disabled)"
                    data-select-chip
                    data-select-option
                    :data-select-selected="view.isSelected(option.value) ? '' : undefined"
                    @click="commitInlineChip(option)"
                >{{ option.label }}</button>
            </div>
        </template>
        </div>
    </div>
</template>
