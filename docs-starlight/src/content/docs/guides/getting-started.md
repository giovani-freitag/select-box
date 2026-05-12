---
title: Getting started
description: Install a select-box wrapper and render your first picker.
---

`select-box` is a framework-agnostic select-box library (an ARIA-compliant
combobox under the hood). The `@select-box/core` package owns state and
behaviour; each per-framework wrapper translates the snapshot into the
framework's native rendering.

## Install

import { Tabs, TabItem } from "@astrojs/starlight/components";

<Tabs>
  <TabItem label="React">
    ```bash
    pnpm add @select-box/react
    ```
  </TabItem>
  <TabItem label="Vue">
    ```bash
    pnpm add @select-box/vue
    ```
  </TabItem>
  <TabItem label="Lit">
    ```bash
    pnpm add @select-box/lit
    ```
  </TabItem>
  <TabItem label="Web Components">
    ```bash
    pnpm add @select-box/webcomponents
    ```
  </TabItem>
  <TabItem label="jQuery">
    ```bash
    pnpm add @select-box/jquery jquery
    ```
  </TabItem>
</Tabs>

## Pick a fruit

See the [select box](/components/select-box/) page for a working demo
and side-by-side code for every wrapper.

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

The [headless vs ready guide](/guides/headless-vs-ready/) walks through
the trade-off.
