<!-- #region snippet -->
<script setup lang="ts">
import { ref } from "vue";
import { SelectBox } from "@select-box/vue";

const fruits = [
    { value: "apple", label: "Apple" },
    { value: "pear", label: "Pear" },
    { value: "peach", label: "Peach" },
    { value: "plum", label: "Plum" },
    { value: "lemon", label: "Lemon" },
];

const committed = ref<ReadonlyArray<string>>([]);
</script>

<template>
    <div class="sb-demo">
        <SelectBox
            multiple
            surface="inline"
            :options="fruits"
            @change="(values) => (committed = values)"
        />
        <output>
            <code>{{ JSON.stringify(committed) }}</code>
        </output>
    </div>
</template>
<!-- #endregion snippet -->
