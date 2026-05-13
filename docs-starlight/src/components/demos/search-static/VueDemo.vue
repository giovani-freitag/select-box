<!-- #region snippet -->
<script setup lang="ts">
import { ref } from "vue";
import { SelectBox } from "@select-box/vue";
import { FuzzyFilterStrategy } from "@select-box/addon-fuzzy";

const FUZZY = new FuzzyFilterStrategy();

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

const committed = ref<(typeof fruits)[number] | null>(null);
</script>

<template>
    <div class="sb-demo">
        <SelectBox
            :options="fruits"
            :filter="FUZZY"
            placeholder="Search fruits…"
            @change="(_value, option) => (committed = option)"
        />
        <output><code>{{ committed ? JSON.stringify(committed) : "null" }}</code></output>
    </div>
</template>
<!-- #endregion snippet -->
