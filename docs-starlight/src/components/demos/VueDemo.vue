<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { SelectBox } from "@select-box/vue";
import { FuzzyFilterStrategy } from "@select-box/addon-fuzzy";
import { SubstringFilterStrategy, type OptionFilterStrategy } from "@select-box/core";

import { getFruitsForScenario, type Fruit, type FruitExtra, type Scenario } from "./fruits";

interface VueDemoProps {
    scenario?: Scenario;
}

const props = withDefaults(defineProps<VueDemoProps>(), { scenario: "grouped" });

const SUBSTRING_FILTER = new SubstringFilterStrategy<FruitExtra>();
const FUZZY_FILTER = new FuzzyFilterStrategy<FruitExtra>();

const committed = ref<Fruit | null>(null);
const filterStrategy = ref<OptionFilterStrategy<FruitExtra>>(SUBSTRING_FILTER);

const fruits = computed(() => getFruitsForScenario(props.scenario));

function handleChange(_value: string | null, option: Fruit | null): void {
    committed.value = option;
}

function handleFilterModeChanged(event: Event): void {
    const mode = (event as CustomEvent<{ mode: "substring" | "fuzzy" }>).detail.mode;
    filterStrategy.value = mode === "fuzzy" ? FUZZY_FILTER : SUBSTRING_FILTER;
}

onMounted(() => {
    if (props.scenario === "search") {
        window.addEventListener("filter-mode-changed", handleFilterModeChanged);
    }
});

onBeforeUnmount(() => {
    window.removeEventListener("filter-mode-changed", handleFilterModeChanged);
});
</script>

<template>
    <div class="sb-demo-card">
        <label class="sb-demo-label">Pick a fruit</label>
        <SelectBox
            :options="fruits"
            :filter="filterStrategy"
            ungrouped-label="Citrus"
            placeholder="Search fruits…"
            @change="handleChange"
        />
        <dl class="sb-demo-snapshot">
            <dt>Last committed value</dt>
            <dd>
                <code>{{ committed ? JSON.stringify(committed) : "null" }}</code>
            </dd>
        </dl>
    </div>
</template>
