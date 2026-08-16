<p align="center">
  <img src="./assets/logo.svg" alt="select-box" width="80" height="80" />
</p>

<h1 align="center">select-box</h1>

<p align="center">
  <strong>One select box. Every framework.</strong><br>
  Framework-agnostic core with thin wrappers for React, Vue, Lit, Web Components, and jQuery.
</p>

<p align="center">
  <em>Same snapshot fields. Same behaviour. Same Playwright matrix proves them all.</em>
</p>

---

## Why

Most select / combobox libraries are tied to a single framework. If your stack mixes
React with a Vue widget and a sprinkle of jQuery (legacy admin, design-system bridges,
multi-app monorepos), you ship three different select-boxes with three different
UX bugs.

`select-box` separates **state and behaviour** from **rendering**. A single
`SingleSelectBoxController` owns search, filtering, virtualization, keyboard
navigation, ARIA combobox semantics, and the addon pipeline. Each framework wrapper
is a thin adapter that subscribes to the controller and renders snapshots — no
framework-specific logic in the core, no behavioural drift across wrappers.

## Features

- **Framework-agnostic core** — pure TypeScript, observer pattern à la TanStack. Drives every wrapper.
- **Identical public API** — `useSelectBox()` / `<select-box>` / `$.fn.selectBox()` all take the same config shape and surface the same `state` fields (`open`, `value`, `query`, `filteredGroups`, `activeIndex`, `isEmpty`, `selectedOption`).
- **Two API tiers per wrapper** — drop-in styled component for the common case, or the headless controller / hook when you need custom UI.
- **ARIA combobox spec built-in** — keyboard nav, focus management, `aria-*` wiring lives in the core. Not patched per-framework.
- **Option groups** — flat-with-`group` or nested `groups`; filtered snapshot exposes `filteredGroups` so wrappers render headers; nav skips disabled rows and headers.
- **Addon system** — opt-in `.use(new Addon(config))` chain. Hooks are pure transformers (reentrancy structurally impossible). Snapshot extension is typed via TypeScript declaration merging.
- **Matrix E2E** — a single Playwright spec runs against every framework's example. A core regression fails N times at once; a wrapper regression fails only its column.

## Quick start

```bash
pnpm add @select-box/react           # or /vue, /lit, /webcomponents, /jquery
```

### React

```tsx
import { SelectBox } from "@select-box/react";

const fruits = [
    { value: "apple", label: "Apple", group: "Pomes" },
    { value: "pear", label: "Pear", group: "Pomes" },
    { value: "lemon", label: "Lemon" },
];

export function App() {
    return (
        <SelectBox
            options={fruits}
            placeholder="Pick a fruit"
            ungroupedLabel="Citrus"
            onChange={(value) => console.log(value)}
        />
    );
}
```

### Web Components

```html
<select-box id="fruit" placeholder="Pick a fruit" ungrouped-label="Citrus"></select-box>

<script type="module">
    import "@select-box/webcomponents/define";

    const element = document.getElementById("fruit");
    element.options = [
        { value: "apple", label: "Apple", group: "Pomes" },
        { value: "pear", label: "Pear", group: "Pomes" },
        { value: "lemon", label: "Lemon" },
    ];
    element.addEventListener("change", (event) => {
        console.log(event.target.value);
    });
</script>
```

For Vue, Lit and jQuery, the API mirrors the same shape. See the [components page](#documentation) for every wrapper side-by-side.

## Headless mode

When the styled component doesn't fit, grab the hook or the controller directly:

```tsx
import { useSelectBox } from "@select-box/react";

function CustomBox() {
    const { state, controller } = useSelectBox({ options: fruits });
    return (
        <div>
            <button onClick={() => controller.toggle()}>
                {state.selectedOption?.label ?? "Select…"}
            </button>
            {state.open && (
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
            )}
        </div>
    );
}
```

The same `SingleSelectBoxController` is available standalone for vanilla / non-framework usage.

## Documentation

Two docs sites coexist while the project decides on its canonical one:

- **`docs-starlight/`** — Astro + Starlight. Each wrapper renders as a real Astro Island on the same page (no iframe). `pnpm --filter @select-box/docs-starlight start` → `localhost:4321`.
- **`docs-vitepress/`** — original VitePress site, kept for reference. Each example runs in an iframe. `pnpm --filter @select-box/docs-vitepress dev` → `localhost:5173`.

API reference for both is auto-generated by TypeDoc from `packages/*/src/index.ts`.

## Repo layout

```
select-box/
├── packages/
│   ├── core/                 # @select-box/core — framework-agnostic
│   ├── webcomponents/        # <select-box> custom element
│   ├── react/                # useSelectBox() + <SelectBox />
│   ├── vue/                  # useSelectBox() + <SelectBox />
│   ├── lit/                  # SelectBox LitElement + ReactiveController
│   └── jquery/               # $.fn.selectBox plugin
├── docs-starlight/           # Astro + Starlight docs (current)
├── docs-vitepress/           # VitePress docs (legacy reference)
├── tooling/                  # shared eslint + tsconfig presets
├── turbo.json
└── pnpm-workspace.yaml
```

Each wrapper publishes:

- A class / hook / component (`SelectBoxElement`, `SelectBox`, `useSelectBox`, `$.fn.selectBox`).
- A `defineSelectBoxElement(tagName?)` function for opt-in registration (custom elements only).
- A `/define` subpath entry that calls `defineSelectBoxElement()` for HTML-first one-liner imports.

## Development

```bash
pnpm install                            # install all workspaces
pnpm build                              # build packages + both docs (turbo)
pnpm test                               # vitest unit tests across packages
pnpm typecheck                          # tsc --noEmit across packages
pnpm lint                               # eslint
```

Per-package or per-doc:

```bash
pnpm --filter @select-box/core test
pnpm --filter @select-box/docs-starlight start
```

## Status

Pilot project. The select-box pulled out of `the-origin-app` is the first
component; conventions and tooling established here become the template for
future components. Single and multi mode are feature-complete across all five
wrappers, in both the popover and the inline-chip surface, with `addon-fuzzy`
and `addon-hoist-selected` shipped. The remaining first-party addons and the
matrix E2E suite are next.

See [PROJECT.md](./PROJECT.md) for the full architectural spec, milestones, and
open decisions.
