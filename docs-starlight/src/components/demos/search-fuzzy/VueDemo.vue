<!-- #region snippet -->
<script setup lang="ts">
import { SelectBox } from "@select-box/vue";
import { FuzzyAddon } from "@select-box/addon-fuzzy";

const fruits = [
    { value: "apple", label: "Apple" },
    { value: "pear", label: "Pear" },
    { value: "peach", label: "Peach" },
    { value: "lemon", label: "Lemon" },
    { value: "blueberry", label: "Blueberry" },
    { value: "raspberry", label: "Raspberry" },
    { value: "strawberry", label: "Strawberry" },
    { value: "watermelon", label: "Watermelon" },
];

const ADDONS = [new FuzzyAddon()];
</script>

<template>
    <div class="sb-demo">
        <SelectBox :options="fruits" :addons="ADDONS" placeholder="Search fruits…" />
    </div>
</template>
<!-- #endregion snippet -->
