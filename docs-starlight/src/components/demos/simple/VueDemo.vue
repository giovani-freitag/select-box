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

const committed = ref<(typeof fruits)[number] | null>(null);
</script>

<template>
    <div class="sb-demo">
        <SelectBox
            :options="fruits"
            placeholder="Pick a fruit"
            @change="(_value, option) => (committed = option)"
        />
        <output><code>{{ committed ? JSON.stringify(committed) : "null" }}</code></output>
    </div>
</template>
<!-- #endregion snippet -->
