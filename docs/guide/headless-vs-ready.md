# Headless vs ready

The library ships two layers per wrapper. Pick the one that matches
your component's needs.

## Ready-to-use component

The "ready" layer is a drop-in component with sensible defaults. It
handles trigger, popover, search input, list rendering, keyboard
navigation, ARIA, and addon-driven UI without you writing any
combobox-specific markup.

::: code-group

```tsx [React]
import { SelectBox } from "@select-box/react";

<SelectBox
    options={fruits}
    placeholder="Pick a fruit"
    onValueChange={(value) => console.log(value)}
/>;
```

```html [Web Components]
<select-box id="fruit" placeholder="Pick a fruit"></select-box>

<script type="module">
    import "@select-box/webcomponents";
    const element = document.getElementById("fruit");
    element.options = fruits;
    element.addEventListener("valuechange", (event) => {
        console.log(event.detail.value);
    });
</script>
```

:::

## Headless

When the default markup doesn't fit (different popover positioning,
custom row layouts, inline rendering, etc.), drop to the headless
layer. You get the live snapshot and the controller — render whatever
you want, the state and keyboard nav still work.

::: code-group

```tsx [React]
import { useSelectBox } from "@select-box/react";

function MyCombobox() {
    const { state, controller } = useSelectBox({ options: fruits });
    return (
        <div>
            <button onClick={() => controller.toggle()}>
                {state.selectedOption?.label ?? "Select…"}
            </button>
            {state.open ? (
                <ul>
                    {state.filteredGroups.flatMap((group) =>
                        group.options.map((option) => (
                            <li key={String(option.value)}>
                                <button onClick={() => controller.commitOption(option)}>
                                    {option.label}
                                </button>
                            </li>
                        )),
                    )}
                </ul>
            ) : null}
        </div>
    );
}
```

```ts [Vanilla / Web Components]
import { SingleSelectBoxController } from "@select-box/core";

const controller = new SingleSelectBoxController({ options: fruits });
controller.subscribe(() => render(controller.getState()));
render(controller.getState());

function render(state) {
    // build DOM imperatively, or rebuild your shadow tree, or hand to
    // whatever rendering layer you prefer — the snapshot is plain data.
}
```

:::

## When in doubt

Start with the ready component. Move to headless only when you hit a
limitation the ready component doesn't expose through props.
