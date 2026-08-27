# 12. Ship one stylesheet, themed through custom properties

- Status: accepted
- Date: 2026-08-26

## Context

Five wrappers rendering the same component could easily ship five stylesheets,
and then a visual fix would have to land five times. But a library that ships
opinionated CSS is also a library nobody can fit into their design system.

## Decision

`@select-box/styles` ships one `select-box.css` that every wrapper imports.
It carries structure — layout, virtualization geometry, states — and takes all
of its colour, radius and shadow from `--sb-*` custom properties. Theming is
redefining tokens, not overriding rules.

Applicability is expressed in the DOM before it is expressed in CSS: a part that
does not apply to the current mode or surface says so on the element with
`hidden`, and the stylesheet follows. State that exists only as a CSS rule is
unassertable outside a browser, and a `::part` rule from the page can outrank it.

## Consequences

- Restyling is a token block. The docs site is exactly that: the shipped sheet
  plus a theme file that maps `--sb-*` onto the Starlight palette, with no
  structural CSS of its own.
- The sheet and the markup must describe the same component, and both directions
  have drifted before — two class names were emitted by all five wrappers with no
  rule at all, so a search highlight fell back to the browser's yellow `mark`.
  An arch test now asserts set equality both ways, plus that no `--sb-*` token is
  declared without being read.
- Consumers who want no CSS from us can skip the import entirely and drive the
  headless controller, which is the tier below the styled component.
