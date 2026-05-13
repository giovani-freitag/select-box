<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import { SelectBox } from "@select-box/vue";
import type { SelectOption } from "@select-box/core";

import type { SillyOption } from "./silly-generator";

const seed = ref<ReadonlyArray<SillyOption>>(readSeed());
const seedVersion = ref(0);
const committedLabel = ref<string | null>(null);

function handleBigListChanged(event: Event): void {
    const detail = (event as CustomEvent<{ options: ReadonlyArray<SelectOption> }>).detail;
    seed.value = detail.options as ReadonlyArray<SillyOption>;
    seedVersion.value += 1;
    committedLabel.value = null;
}

function handleChange(_value: string | null, option: SillyOption | null): void {
    committedLabel.value = option?.label ?? null;
}

function readSeed(): ReadonlyArray<SillyOption> {
    if (typeof window === "undefined") return [];
    const value = window.__bigListSeed;
    return Array.isArray(value) ? (value as ReadonlyArray<SillyOption>) : [];
}

onMounted(() => {
    window.addEventListener("big-list-changed", handleBigListChanged);
    // Page-level controls may have populated the seed before this island
    // hydrated; sync once at mount in case the event fired earlier.
    seed.value = readSeed();
});

onBeforeUnmount(() => {
    window.removeEventListener("big-list-changed", handleBigListChanged);
});
</script>

<template>
    <div class="sb-demo-card">
        <label class="sb-demo-label">Pick a critter ({{ seed.length.toLocaleString() }})</label>
        <SelectBox
            :key="seedVersion"
            :options="seed"
            placeholder="Search the menagerie…"
            @change="handleChange"
        />
        <dl class="sb-demo-snapshot">
            <dt>Last committed</dt>
            <dd><code>{{ committedLabel ?? "null" }}</code></dd>
        </dl>
    </div>
</template>
