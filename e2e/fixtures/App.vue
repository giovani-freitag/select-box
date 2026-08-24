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
        :name="config.name"
        :required="config.required"
        :default-value="config.initialValue ?? null"
        :aria-label="config.ariaLabel"
        @change="(value: unknown) => reportChange(value)"
        @change-multi="(values: unknown) => reportChange(values)"
    />
</template>
