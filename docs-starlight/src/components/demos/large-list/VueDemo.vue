<!-- #region snippet -->
<script setup lang="ts">
import { computed, ref } from "vue";
import { SelectBox } from "@select-box/vue";

function generate(count: number): ReadonlyArray<{ value: string; label: string }> {
    return Array.from({ length: count }, (_, index) => ({
        value: String(index),
        label: `Item ${index + 1}`,
    }));
}

const count = ref(1000);
const options = computed(() => generate(count.value));
</script>

<template>
    <div class="sb-demo">
        <label>
            Items: <strong>{{ count.toLocaleString() }}</strong>
            <input
                type="range"
                min="100"
                max="100000"
                step="100"
                v-model.number="count"
            />
        </label>
        <SelectBox :key="count" :options="options" placeholder="Search…" />
    </div>
</template>
<!-- #endregion snippet -->
