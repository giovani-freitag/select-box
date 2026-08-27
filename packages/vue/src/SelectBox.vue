<script setup lang="ts" generic="TExtra extends object = object">
import {
    type OptionFilterStrategy,
    type SelectBoxAddon,
    type SelectBoxController,
    type SelectBoxSnapshot,
    type SelectionValue,
    type SelectOption,
} from "@select-box/core";
import { computed, ref, watch, type ShallowRef } from "vue";

import { useFilterReactivity } from "./composables/use-filter-reactivity.js";
import { useInteractivityReactivity } from "./composables/use-interactivity-reactivity.js";
import { useOptionsReactivity } from "./composables/use-options-reactivity.js";
import { useNotifyChange } from "./composables/use-notify-change.js";
import { useSelectBox } from "./composables/use-select-box.js";
import InlineSurface from "./InlineSurface.vue";
import PopoverSurface from "./PopoverSurface.vue";

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
    /** Refuses every interaction and stays out of the form data, like a disabled input. */
    disabled?: boolean;
    /** Refuses changes while staying focusable and submitted, like a readonly input. */
    readOnly?: boolean;
    /** Field name under which the selection is submitted. Omit to stay out of the form. */
    name?: string;
    /** Blocks submission while nothing is selected, natively. */
    required?: boolean;
    /**
     * Accessible name for the combobox.
     *
     * An explicit prop rather than attribute fallthrough, because a bare
     * `aria-label` would land on the root and the role lives on a child.
     */
    ariaLabel?: string;
    ariaLabelledby?: string;
}

const props = withDefaults(defineProps<SelectBoxProps<TExtra>>(), {
    defaultValue: null,
    multi: false,
    surface: "popover",
    disabled: false,
    readOnly: false,
});
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
        disabled: props.disabled,
        readOnly: props.readOnly,
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

watch(
    () => props.multi,
    (multi) => {
        controller.setMode(multi ? "multi" : "single");
    },
);

useFilterReactivity(controller, computed(() => props.filter));
useOptionsReactivity(controller, computed(() => props.options));
useInteractivityReactivity(
    controller,
    computed(() => props.disabled),
    computed(() => props.readOnly),
);
useNotifyChange(state, {
    single: (value, option) => emit("change", value, option),
    multi: (values, options) => emit("change-multi", values, options),
});

const isInline = computed(() => props.surface === "inline");

const surfaceInstance = ref<{ root: HTMLDivElement | null } | null>(null);

/**
 * Imperative surface reachable through a template ref: the root element and the
 * core controller, the same two members every wrapper exposes.
 */
defineExpose({
    get root(): HTMLDivElement | null {
        return surfaceInstance.value?.root ?? null;
    },
    controller,
});
</script>

<template>
    <InlineSurface
        v-if="isInline"
        ref="surfaceInstance"
        :state="state"
        :controller="controller"
        :name="name"
        :required="required"
        :aria-label-text="ariaLabel"
        :aria-labelledby-ref="ariaLabelledby"
    />
    <PopoverSurface
        v-else
        ref="surfaceInstance"
        :state="state"
        :controller="controller"
        :placeholder="placeholder"
        :name="name"
        :required="required"
        :aria-label-text="ariaLabel"
        :aria-labelledby-ref="ariaLabelledby"
    />
</template>
