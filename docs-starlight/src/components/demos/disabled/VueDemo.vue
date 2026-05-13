<!-- #region snippet -->
<script setup lang="ts">
import { SelectBox } from "@select-box/vue";

const fruits = [
    { value: "apple", label: "Apple", group: "In stock" },
    { value: "pear", label: "Pear", group: "In stock" },
    { value: "grape", label: "Grape", group: "In stock", disabled: true },
    { value: "plum", label: "Plum", group: "Out of season", disabled: true },
    { value: "cherry", label: "Cherry", group: "Out of season", disabled: true },
    { value: "lemon", label: "Lemon" },
    { value: "orange", label: "Orange", disabled: true },
];
</script>

<template>
    <div class="sb-demo">
        <SelectBox
            :options="fruits"
            ungrouped-label="Citrus"
            placeholder="Pick a fruit"
        />
    </div>
</template>
<!-- #endregion snippet -->
