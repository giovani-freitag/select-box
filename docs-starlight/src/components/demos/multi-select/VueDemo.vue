<!-- #region snippet -->
<script setup lang="ts">
import { ref } from "vue";
import { SelectBox, type SelectOption } from "@select-box/vue";

const fruits = [
    { value: "apple", label: "Apple", group: "Pomes" },
    { value: "pear", label: "Pear", group: "Pomes" },
    { value: "peach", label: "Peach", group: "Stone fruits" },
    { value: "plum", label: "Plum", group: "Stone fruits" },
    { value: "lemon", label: "Lemon" },
    { value: "orange", label: "Orange" },
];

const committed = ref<ReadonlyArray<SelectOption>>([]);
</script>

<template>
    <div class="sb-demo multi-demo">
        <SelectBox
            multi
            :options="fruits"
            ungrouped-label="Citrus"
            placeholder="Pick fruits…"
            @change-multi="(_values, options) => (committed = options)"
        />
        <output>
            <code>{{ JSON.stringify(committed) }}</code>
        </output>
    </div>
</template>
<!-- #endregion snippet -->
