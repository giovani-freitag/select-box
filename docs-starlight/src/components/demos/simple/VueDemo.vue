<!-- #region snippet -->
<script setup lang="ts">
import { ref } from "vue";
import { SelectBox } from "@select-box/vue";

const fruits = [
    { value: "apple", label: "Apple" },
    { value: "pear", label: "Pear" },
    { value: "grape", label: "Grape" },
    { value: "lemon", label: "Lemon" },
    { value: "peach", label: "Peach" },
];

const committed = ref<string | null>(null);
</script>

<template>
    <div class="sb-demo">
        <SelectBox
            :options="fruits"
            placeholder="Pick a fruit"
            @change="(value) => (committed = value)"
        />
        <output><code>{{ JSON.stringify(committed) }}</code></output>
    </div>
</template>
<!-- #endregion snippet -->
