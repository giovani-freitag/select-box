<!-- #region snippet -->
<script setup lang="ts">
import { ref } from "vue";
import { SelectBox } from "@select-box/vue";
import { FuzzyFilterStrategy } from "@select-box/addon-fuzzy";
import { SubstringFilterStrategy, type OptionFilterStrategy } from "@select-box/core";

const SUBSTRING = new SubstringFilterStrategy();
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
const filter = ref<OptionFilterStrategy>(SUBSTRING);

function handleToggle(event: Event): void {
    filter.value = (event.target as HTMLInputElement).checked ? FUZZY : SUBSTRING;
}
</script>

<template>
    <div class="sb-demo">
        <label>
            <input type="checkbox" @change="handleToggle" />
            Use fuzzy search
        </label>
        <SelectBox
            :options="fruits"
            :filter="filter"
            placeholder="Search fruits…"
            @change="(_value, option) => (committed = option)"
        />
        <output><code>{{ committed ? JSON.stringify(committed) : "null" }}</code></output>
    </div>
</template>
<!-- #endregion snippet -->
