<script setup lang="ts">
import { ref } from "vue";
import { SelectBox } from "@select-box/vue";

import { simpleFruits, type Fruit, type FruitExtra } from "./fruits";

const committed = ref<Fruit | null>(null);

function handleChange(_value: string | null, option: Fruit | null): void {
    committed.value = option;
}
</script>

<template>
    <div class="sb-demo-card">
        <label class="sb-demo-label">Pick a fruit</label>
        <SelectBox
            :options="simpleFruits"
            placeholder="Search fruits…"
            @change="handleChange"
        />
        <dl class="sb-demo-snapshot">
            <dt>Last committed value</dt>
            <dd>
                <code>{{ committed ? JSON.stringify(committed) : "null" }}</code>
            </dd>
        </dl>
    </div>
</template>
