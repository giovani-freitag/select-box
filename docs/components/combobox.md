# Combobox

A single-select combobox with grouped options, fuzzy filter, keyboard
navigation, and an opt-in addon system. Switch the framework tab below
to see the same behaviour in each wrapper.

## Live demo

<ClientOnly>
  <FrameworkSwitcher
    :frames="[
      { label: 'React', src: '/examples/react/' },
      { label: 'Web Components', src: '/examples/webcomponents/' },
    ]"
  />
</ClientOnly>

## Source

The same demo, rendered by each wrapper, lives in
[`examples/react/`](https://github.com/) and
[`examples/webcomponents/`](https://github.com/). The relevant files are
shown below.

### App entry

::: code-group

```tsx [React]
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
            placeholder="Pick a fruit"
            ungroupedLabel="Citrus"
            onValueChange={setCommitted}
        />
    );
}
```

```html [Web Components]
<select-box id="fruit" placeholder="Pick a fruit" ungrouped-label="Citrus"></select-box>

<script type="module">
    import "@select-box/webcomponents";

    const fruits = [
        { value: { id: 1, name: "apple" }, label: "Apple", group: "Pomes" },
        { value: { id: 2, name: "pear" }, label: "Pear", group: "Pomes" },
        { value: { id: 3, name: "lemon" }, label: "Lemon" },
    ];

    const element = document.getElementById("fruit");
    element.options = fruits;
    element.addEventListener("valuechange", (event) => {
        console.log(event.detail.value);
    });
</script>
```

:::

## Props / Attributes

| Field | React prop | Custom-element |
|---|---|---|
| Options (flat) | `options` | `.options` (property) |
| Options (grouped) | `groups` | `.groups` (property) |
| Initial value | `defaultValue` | `.value` (property) |
| Change callback | `onValueChange` | `valuechange` event |
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
