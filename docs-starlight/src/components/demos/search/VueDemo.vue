<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import { SelectBox } from "@select-box/vue";
import { FuzzyFilterStrategy } from "@select-box/addon-fuzzy";
import { SubstringFilterStrategy, type OptionFilterStrategy } from "@select-box/core";

import { searchableFruits, type Fruit, type FruitExtra } from "./fruits";

const SUBSTRING = new SubstringFilterStrategy<FruitExtra>();
const FUZZY = new FuzzyFilterStrategy<FruitExtra>();

const committed = ref<Fruit | null>(null);
const filter = ref<OptionFilterStrategy<FruitExtra>>(SUBSTRING);

function handleChange(_value: string | null, option: Fruit | null): void {
    committed.value = option;
}

function handleModeChanged(event: Event): void {
    const mode = (event as CustomEvent<{ mode: "substring" | "fuzzy" }>).detail.mode;
    filter.value = mode === "fuzzy" ? FUZZY : SUBSTRING;
}

onMounted(() => window.addEventListener("filter-mode-changed", handleModeChanged));
onBeforeUnmount(() => window.removeEventListener("filter-mode-changed", handleModeChanged));
</script>

<template>
    <div class="sb-demo-card">
        <label class="sb-demo-label">Pick a fruit</label>
        <SelectBox
            :options="searchableFruits"
            :filter="filter"
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
