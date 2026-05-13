<!-- #region snippet -->
<script setup lang="ts">
import { SelectBox } from "@select-box/vue";

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
</script>

<template>
    <div class="sb-demo">
        <SelectBox :options="fruits" placeholder="Search fruits…" />
    </div>
</template>
<!-- #endregion snippet -->
