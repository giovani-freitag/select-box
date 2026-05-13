<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { SelectBox } from "@select-box/vue";
import { FuzzyFilterStrategy } from "@select-box/addon-fuzzy";
import { SubstringFilterStrategy, type OptionFilterStrategy, type SelectOption } from "@select-box/core";

import {
    getFruitsForScenario,
    getUngroupedLabelForScenario,
    type Fruit,
    type FruitExtra,
    type Scenario,
} from "./fruits";
import type { SillyOption } from "./silly-generator";

interface VueDemoProps {
    scenario?: Scenario;
}

const props = withDefaults(defineProps<VueDemoProps>(), { scenario: "grouped" });

const SUBSTRING_FILTER = new SubstringFilterStrategy<FruitExtra>();
const FUZZY_FILTER = new FuzzyFilterStrategy<FruitExtra>();

const committed = ref<Fruit | null>(null);
const filterStrategy = ref<OptionFilterStrategy<FruitExtra>>(SUBSTRING_FILTER);

const fruits = computed(() => getFruitsForScenario(props.scenario));
const ungroupedLabel = computed(() => getUngroupedLabelForScenario(props.scenario));

// Large-list state
const seed = ref<ReadonlyArray<SillyOption>>(readSeed());
const seedVersion = ref(0);
const committedLabel = ref<string | null>(null);

function handleChange(_value: string | null, option: Fruit | null): void {
    committed.value = option;
}

function handleFilterModeChanged(event: Event): void {
    const mode = (event as CustomEvent<{ mode: "substring" | "fuzzy" }>).detail.mode;
    filterStrategy.value = mode === "fuzzy" ? FUZZY_FILTER : SUBSTRING_FILTER;
}

function handleBigListChanged(event: Event): void {
    const detail = (event as CustomEvent<{ options: ReadonlyArray<SelectOption> }>).detail;
    seed.value = detail.options as ReadonlyArray<SillyOption>;
    seedVersion.value += 1;
    committedLabel.value = null;
}

function handleLargeChange(_value: string | null, option: SillyOption | null): void {
    committedLabel.value = option?.label ?? null;
}

function readSeed(): ReadonlyArray<SillyOption> {
    if (typeof window === "undefined") return [];
    const value = window.__bigListSeed;
    return Array.isArray(value) ? (value as ReadonlyArray<SillyOption>) : [];
}

onMounted(() => {
    if (props.scenario === "search") {
        window.addEventListener("filter-mode-changed", handleFilterModeChanged);
    }
    if (props.scenario === "large-list") {
        window.addEventListener("big-list-changed", handleBigListChanged);
        // Sync once at mount in case the page-level script already fired.
        seed.value = readSeed();
    }
});

onBeforeUnmount(() => {
    window.removeEventListener("filter-mode-changed", handleFilterModeChanged);
    window.removeEventListener("big-list-changed", handleBigListChanged);
});

</script>

<template>
    <div v-if="scenario === 'large-list'" class="sb-demo-card">
        <label class="sb-demo-label">Pick a critter ({{ seed.length.toLocaleString() }})</label>
        <SelectBox
            :key="seedVersion"
            :options="seed"
            placeholder="Search the menagerie…"
            @change="handleLargeChange"
        />
        <dl class="sb-demo-snapshot">
            <dt>Last committed</dt>
            <dd><code>{{ committedLabel ?? "null" }}</code></dd>
        </dl>
    </div>

    <div v-else class="sb-demo-card">
        <label class="sb-demo-label">Pick a fruit</label>
        <SelectBox
            :options="fruits"
            :filter="filterStrategy"
            :ungrouped-label="ungroupedLabel"
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
