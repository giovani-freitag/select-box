<!-- #region snippet -->
<script setup lang="ts">
import { ref } from "vue";
import { SelectBox } from "@select-box/vue";

const fruits = [
    { value: "apple", label: "Apple", group: "Pomes" },
    { value: "pear", label: "Pear", group: "Pomes" },
    { value: "peach", label: "Peach", group: "Stone fruits" },
    { value: "plum", label: "Plum", group: "Stone fruits" },
    { value: "lemon", label: "Lemon" },
    { value: "orange", label: "Orange" },
];

const committed = ref<(typeof fruits)[number] | null>(null);
</script>

<template>
    <div class="sb-demo">
        <SelectBox
            :options="fruits"
            ungrouped-label="Citrus"
            placeholder="Pick a fruit"
            @change="(_value, option) => (committed = option)"
        />
        <output><code>{{ committed ? JSON.stringify(committed) : "null" }}</code></output>
    </div>
</template>
<!-- #endregion snippet -->
