# Select Box

A single-select box with grouped options, fuzzy filter, keyboard
navigation, and an opt-in addon system. Switch the framework tab below
to see the same select box rendered by each wrapper — the preview is the
real example app from `examples/<framework>/` running in an iframe.

<ClientOnly>
<FrameworkExample
  :frameworks="[
    { id: 'jquery', label: 'jQuery', src: '/examples/jquery/index.html' },
    { id: 'lit', label: 'Lit', src: '/examples/lit/index.html' },
    { id: 'react', label: 'React', src: '/examples/react/index.html' },
    { id: 'vue', label: 'Vue', src: '/examples/vue/index.html' },
    { id: 'webcomponents', label: 'Web Components', src: '/examples/webcomponents/index.html' }
  ]"
>

<template #jquery-code>

```ts
import "@select-box/jquery";
import jQuery from "jquery";

const fruits = [
    { value: { id: 1, name: "apple" }, label: "Apple", group: "Pomes" },
    { value: { id: 2, name: "pear" }, label: "Pear", group: "Pomes" },
    { value: { id: 3, name: "lemon" }, label: "Lemon" },
];

jQuery("#fruit").on("change", (_event, value) => {
    console.log(value);
});

const box = jQuery("#fruit").selectBox({
    options: fruits,
    placeholder: "Search fruits…",
    ungroupedLabel: "Citrus",
});
```

</template>

<template #lit-code>

```ts
import { SelectBox } from "@select-box/lit";

customElements.define("select-box", SelectBox);

const fruits = [
    { value: { id: 1, name: "apple" }, label: "Apple", group: "Pomes" },
    { value: { id: 2, name: "pear" }, label: "Pear", group: "Pomes" },
    { value: { id: 3, name: "lemon" }, label: "Lemon" },
];

const element = document.querySelector("select-box");
element.options = fruits;
element.placeholder = "Search fruits…";

element.addEventListener("change", (event) => {
    console.log(event.target.value);
});
```

</template>

<template #react-code>

```tsx
import { SelectBox } from "@select-box/react";
import { useState } from "react";

const fruits = [
    { value: { id: 1, name: "apple" }, label: "Apple", group: "Pomes" },
    { value: { id: 2, name: "pear" }, label: "Pear", group: "Pomes" },
    { value: { id: 3, name: "lemon" }, label: "Lemon" },
];

export function App() {
    const [committed, setCommitted] = useState(null);
    return (
        <SelectBox
            options={fruits}
            placeholder="Search fruits…"
            ungroupedLabel="Citrus"
            onChange={setCommitted}
        />
    );
}
```

</template>

<template #vue-code>

```vue
<script setup lang="ts">
import { SelectBox } from "@select-box/vue";
import { ref } from "vue";

const fruits = [
    { value: { id: 1, name: "apple" }, label: "Apple", group: "Pomes" },
    { value: { id: 2, name: "pear" }, label: "Pear", group: "Pomes" },
    { value: { id: 3, name: "lemon" }, label: "Lemon" },
];

const committed = ref(null);
</script>

<template>
    <SelectBox
        :options="fruits"
        placeholder="Search fruits…"
        ungroupedLabel="Citrus"
        @change="(value) => (committed = value)"
    />
</template>
```

</template>

<template #webcomponents-code>

```html
<select-box id="fruit" placeholder="Search fruits…" ungrouped-label="Citrus"></select-box>

<script type="module">
    import "@select-box/webcomponents";

    const fruits = [
        { value: { id: 1, name: "apple" }, label: "Apple", group: "Pomes" },
        { value: { id: 2, name: "pear" }, label: "Pear", group: "Pomes" },
        { value: { id: 3, name: "lemon" }, label: "Lemon" },
    ];

    const element = document.getElementById("fruit");
    element.options = fruits;
    element.addEventListener("change", (event) => {
        console.log(event.target.value);
    });
</script>
```

</template>

</FrameworkExample>
</ClientOnly>

## Props / Attributes

| Field | React prop | Custom-element |
|---|---|---|
| Options (flat) | `options` | `.options` (property) |
| Options (grouped) | `groups` | `.groups` (property) |
| Initial value | `defaultValue` | `.value` (property) |
| Change callback | `onChange` | `change` event (read `event.target.value`) |
| Placeholder | `placeholder` | `placeholder` attribute |
| Ungrouped label | `ungroupedLabel` | `ungrouped-label` attribute |
| Addons | `addons` | `.addons` (property) |
| Custom filter | `filter` | `.filter` (property) |

## Keyboard

| Key | Action |
|---|---|
| `↓` / `↑` | Move active option (skips disabled). When closed, `↓` also opens the popover. |
| `Enter` | Commit the active option. |
| `Escape` | Close the popover. |
| Click outside | Close the popover. |
