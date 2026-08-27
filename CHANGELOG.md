# Changelog

## 0.1.0 (2026-08-26)

First public release. The library is feature-complete for single and multi
select across all five wrappers, on both the popover and the inline-chip
surface, and is versioned as `0.x` because the API is still free to move.

### Features

* A framework-agnostic `SelectBoxController` owning search, filtering,
  virtualization, keyboard navigation, ARIA wiring and the addon pipeline.
* Wrappers for React, Vue, Lit, Web Components and jQuery, all reading the same
  snapshot fields and exposing the same `root` and `controller` handle.
* Single and multi select, switchable at runtime, with cardinality delegated to
  a pluggable selection driver.
* Option groups with `<optgroup>` parity — filtered snapshots expose grouped
  rows, and keyboard navigation skips headers and disabled options.
* Native form participation on every wrapper: `disabled`, `readOnly`, `name`
  and `required`, submitted through `ElementInternals` or a mirrored native
  `<select>`.
* List virtualization over `@tanstack/virtual-core`, measured rather than
  fixed-height.
* Seven first-party addons on a complete hook surface: fuzzy filtering, hoist
  selected, clear button, create option, remove button, restore on backspace and
  persistence.
* One shared stylesheet themed entirely through `--sb-*` custom properties.

### Documentation

* An Astro + Starlight site with every wrapper rendering live on the same page,
  a TypeDoc API reference, and architecture decision records under `docs/adr/`.
