<script setup lang="ts" generic="TExtra extends object = object">
import type {
    OptionFilterStrategy,
    SelectBoxAddon,
    SelectGroup,
    SelectOption,
} from "@select-box/core";
import { computed, nextTick, onBeforeUnmount, onMounted, useTemplateRef, watch } from "vue";

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

const flatIndexByOption = computed<Map<SelectOption<TExtra>, number>>(() => {
    const map = new Map<SelectOption<TExtra>, number>();
    let nextIndex = 0;
    for (const group of state.value.filteredGroups) {
        if (group.disabled) continue;
        for (const option of group.options) {
            if (option.disabled) continue;
            map.set(option, nextIndex);
            nextIndex += 1;
        }
    }
    return map;
});

let previousValue: string | null = state.value.value;
watch(
    () => state.value.value,
    (next) => {
        if (next === previousValue) return;
        previousValue = next;
        emit("change", next, state.value.selectedOption);
    },
);

onMounted(() => {
    document.addEventListener("mousedown", handleOutsideMouseDown);
});

onBeforeUnmount(() => {
    document.removeEventListener("mousedown", handleOutsideMouseDown);
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

function isOptionActive(option: SelectOption<TExtra>): boolean {
    return flatIndexByOption.value.get(option) === state.value.activeIndex;
}

function optionClasses(option: SelectOption<TExtra>): string {
    return [
        "select-box-option",
        isOptionActive(option) ? "select-box-option-active" : null,
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
            <div class="select-box-list" data-select-list>
                <p v-if="state.isEmpty" class="select-box-empty" data-select-empty>No matches</p>
                <template v-else>
                    <div
                        v-for="group in state.filteredGroups"
                        :key="group.key"
                        class="select-box-group"
                        data-select-group
                    >
                        <div v-if="group.label" class="select-box-group-label">{{ group.label }}</div>
                        <button
                            v-for="option in group.options"
                            :key="String(option.value)"
                            type="button"
                            :class="optionClasses(option)"
                            :disabled="option.disabled"
                            data-select-option
                            :data-select-active="isOptionActive(option) ? '' : undefined"
                            @mousedown.prevent
                            @click="controller.commitOption(option)"
                        >
                            {{ option.label }}
                        </button>
                    </div>
                </template>
            </div>
        </div>
    </div>
</template>
