<script setup lang="ts">
import { SelectBox } from "@select-box/vue";
import { ref } from "vue";

import { readFixtureConfig } from "./config.js";
import { reportChange } from "./report.js";

const config = readFixtureConfig();
const surface = ref(config.surface);

function toggleSurface(): void {
    surface.value = surface.value === "inline" ? "popover" : "inline";
}

defineExpose({ toggleSurface });
</script>

<template>
    <SelectBox
        :options="config.options"
        :placeholder="config.placeholder"
        :multi="config.multi"
        :surface="surface"
        @change="(value: unknown) => reportChange(value)"
        @change-multi="(values: unknown) => reportChange(values)"
    />
</template>
