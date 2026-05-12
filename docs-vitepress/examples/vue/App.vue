<script setup lang="ts">
import { SelectBox } from "@select-box/vue";
import type { SelectOption } from "@select-box/core";
import { ref } from "vue";

interface FruitExtra {
    readonly id: number;
    readonly name: string;
}

type Fruit = SelectOption<FruitExtra>;

const fruits = [
    { value: "apple", label: "Apple", group: "Pomes", id: 1, name: "apple" },
    { value: "pear", label: "Pear", group: "Pomes", id: 2, name: "pear" },
    { value: "quince", label: "Quince", group: "Pomes", id: 3, name: "quince" },
    { value: "peach", label: "Peach", group: "Stone fruits", id: 4, name: "peach" },
    { value: "plum", label: "Plum", group: "Stone fruits", id: 5, name: "plum" },
    { value: "cherry", label: "Cherry", group: "Stone fruits", disabled: true, id: 6, name: "cherry" },
    { value: "lemon", label: "Lemon", id: 7, name: "lemon" },
    { value: "orange", label: "Orange", id: 8, name: "orange" },
    { value: "lime", label: "Lime", id: 9, name: "lime" },
];

const committed = ref<Fruit | null>(null);

function handleChange(_value: string | null, option: Fruit | null): void {
    committed.value = option;
}
</script>

<template>
    <main class="demo">
        <label class="field-label">Pick a fruit</label>
        <SelectBox
            :options="fruits"
            ungrouped-label="Citrus"
            placeholder="Search fruits…"
            @change="handleChange"
        />

        <dl class="snapshot">
            <dt>Last committed value</dt>
            <dd>
                <code>{{ committed ? JSON.stringify(committed) : "null" }}</code>
            </dd>
        </dl>
    </main>
</template>
