---
layout: home

hero:
  name: select-box
  text: Headless select box, every framework
  tagline: Framework-agnostic core, ready-to-use wrappers for React, Web Components, Vue, Lit, jQuery. Same snapshot fields, same behaviour, same E2E suite.
  actions:
    - theme: brand
      text: Get started
      link: /guide/getting-started
    - theme: alt
      text: Try it live
      link: /components/select-box

features:
  - title: One core, many wrappers
    details: SingleSelectBoxController owns state and behaviour. Each wrapper is a thin adapter that translates snapshots into framework-native rendering.
  - title: Headless or ready
    details: Use the high-level component (<SelectBox /> in React, <select-box> as a custom element) for the common case, or drop down to useSelectBox() / the controller directly for fully custom UI.
  - title: Addons via declaration merging
    details: First-party addons (clear-button, hoist-selected, …) opt in via .use() and extend the snapshot through TypeScript declaration merging — typed without casts.
---
