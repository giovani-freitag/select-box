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
import { useValueReactivity, type OwnerEcho } from "./composables/use-value-reactivity.js";
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
    /**
     * Selection owned by the caller, applied even while the control refuses input.
     *
     * Makes the box controlled: a pick the owner does not answer through the
     * `change` event is reverted to what the prop still says.
     */
    value?: string | number | null | ReadonlyArray<string | number>;
    /**
     * What `v-model` binds to. The same selection `value` carries, under the
     * name Vue's own sugar compiles to; supply either. `modelValue` wins if
     * both are given.
     */
    modelValue?: string | number | null | ReadonlyArray<string | number>;
    /** Initial selection for an uncontrolled box. Ignored once `value` is supplied. */
    defaultValue?: string | number | null | ReadonlyArray<string | number>;
    placeholder?: string;
    /**
     * Text shown when the query matches nothing.
     *
     * Pass it already translated; the component stays locale-agnostic, the same
     * way the addons do.
     */
    emptyMessage?: string;
    ungroupedLabel?: string;
    addons?: ReadonlyArray<SelectBoxAddon<TExtra>>;
    filter?: OptionFilterStrategy<TExtra>;
    /** When `true`, switches to multi-select (chips inside the input, popover stays open on commit). */
    multiple?: boolean;
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
    multiple: false,
    surface: "popover",
    disabled: false,
    readOnly: false,
});
const emit = defineEmits<{
    /**
     * The committed selection changed.
     *
     * One event whatever the mode, so a listener never has to know which to
     * bind: single mode passes `(value, option)`, multi passes
     * `(values, options)`. Declared as one signature rather than an overload
     * pair on purpose — an overload would force every listener to accept both
     * arguments, and `@change="(value) => …"` is what people write.
     */
    (
        event: "change",
        value: string | null | ReadonlyArray<string>,
        option: SelectOption<TExtra> | null | ReadonlyArray<SelectOption<TExtra>>,
    ): void;
    /** Mirrors `change` so `v-model` binds the selection the way Vue expects. */
    (event: "update:modelValue", value: string | null | ReadonlyArray<string>): void;
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
const useResult = props.multiple
    ? useSelectBox<TExtra>({
        mode: "multi",
        ...commonConfig(),
        defaultValue: (props.modelValue ?? props.value ?? (Array.isArray(props.defaultValue)
            ? (props.defaultValue as ReadonlyArray<string | number>)
            : [])) as ReadonlyArray<string | number>,
    })
    : useSelectBox<TExtra>({
        ...commonConfig(),
        defaultValue: (props.modelValue ?? props.value ?? (Array.isArray(props.defaultValue)
            ? null
            : props.defaultValue)) as string | number | null,
    });

const state = useResult.state as ShallowRef<SelectBoxSnapshot<TExtra, SelectionValue>>;
const controller = useResult.controller as SelectBoxController<TExtra, SelectionValue>;

watch(
    () => props.multiple,
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
// Shared between the two directions of a controlled value: what the owner
// pushed in, so the notifier does not read it back out as a fresh change.
const ownerEcho: OwnerEcho = { current: null };

/** `v-model` and `value` are the same selection; the explicit binding wins. */
const ownedValue = computed(() => props.modelValue ?? props.value);

// Order matters. Watchers run in creation order, so the announcement has to be
// registered before the push that stamps the next echo.
useNotifyChange(
    state,
    {
        single: (value, option) => {
            emit("change", value, option);
            emit("update:modelValue", value);
        },
        multiple: (values, options) => {
            emit("change", values, options);
            emit("update:modelValue", values);
        },
    },
    ownerEcho,
);
useValueReactivity(
    controller,
    ownedValue,
    state,
    ownerEcho,
);

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
        :empty-message="emptyMessage"
        :name="name"
        :required="required"
        :aria-label-text="ariaLabel"
        :aria-labelledby-ref="ariaLabelledby"
    />
</template>
