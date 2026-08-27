<script setup lang="ts" generic="TExtra extends object = object">
import {
    type SelectBoxController,
    type SelectBoxSnapshot,
    type SelectionValue,
} from "@select-box/core";
import { computed, onBeforeUnmount, onMounted, useTemplateRef } from "vue";

/**
 * A real `<select>`, visually hidden, mirroring the current selection.
 *
 * This is what carries the widget into a form. Nothing about submission or
 * constraint validation is reimplemented: the browser sees a native control
 * with a `name`, `required` and the selected options, so submission, `required`
 * blocking, `form.reset()` and autofill all behave natively. Custom-element
 * wrappers get the same reach through `ElementInternals` instead.
 */
const props = defineProps<{
    state: SelectBoxSnapshot<TExtra, SelectionValue>;
    controller: SelectBoxController<TExtra, SelectionValue>;
    name: string | undefined;
    required: boolean | undefined;
}>();

const mirrorRef = useTemplateRef<HTMLSelectElement>("mirrorEl");
const isMulti = computed(() => props.state.mode === "multi");
const selected = computed(() => props.state.selectedOptions.map((option) => option.value));

/**
 * Only what submission needs: the chosen options, plus the empty one that lets
 * `required` fail while nothing is selected.
 *
 * Mirroring the whole list would undo the windowing the popover does — a named
 * box over a hundred thousand options would put every one of them in the
 * document — and mirroring the *filtered* list would drop the selection the
 * moment a query excluded it, leaving the browser to fall back to the first
 * option.
 */
const mirroredOptions = computed(() => [
    ...(isMulti.value ? [] : [{ value: "", label: "" }]),
    ...props.state.selectedOptions.map((option) => ({
        value: option.value,
        label: option.label,
    })),
]);

function handleReset(): void {
    props.controller.reset();
}

onMounted(() => {
    mirrorRef.value?.form?.addEventListener("reset", handleReset);
});

onBeforeUnmount(() => {
    mirrorRef.value?.form?.removeEventListener("reset", handleReset);
});
</script>

<template>
    <select
        v-if="name !== undefined && name !== ''"
        ref="mirrorEl"
        class="select-box-form-mirror"
        data-select-form-mirror
        aria-hidden="true"
        tabindex="-1"
        :name="name"
        :multiple="isMulti"
        :required="required === true"
        :disabled="state.disabled"
    >
        <option
            v-for="option in mirroredOptions"
            :key="option.value"
            :value="option.value"
            :selected="selected.includes(option.value) || (!isMulti && selected.length === 0 && option.value === '')"
        >
            {{ option.label }}
        </option>
    </select>
</template>
