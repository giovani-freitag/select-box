# Getting started

`select-box` is a framework-agnostic combobox library. The
`@select-box/core` package owns state and behaviour; each per-framework
wrapper translates the snapshot into the framework's native rendering.

## Install

::: code-group

```bash [React]
pnpm add @select-box/react
```

```bash [Web Components]
pnpm add @select-box/webcomponents
```

:::

## Pick a fruit

See the [combobox component](/components/combobox) page for a working
demo and side-by-side code for every wrapper.

## Two API tiers

Every wrapper exposes two layers, so you pick the right one for your
component's complexity:

- **Ready-to-use component** — drop-in, sensible defaults, styled via
  class names or `::part()`. Use this when you don't need custom
  markup.
- **Headless primitives** — `useSelectBox()` in React, the
  `SelectBoxController` class for vanilla/web-components. Use this when
  you need custom UI; you get the snapshot and the controller and
  render whatever you want.

The [headless vs ready guide](/guide/headless-vs-ready) walks through
the trade-off.
