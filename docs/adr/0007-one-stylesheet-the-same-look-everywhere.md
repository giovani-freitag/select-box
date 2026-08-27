# 7. One stylesheet, the same look everywhere

- Status: accepted

## Context

Five wrappers could easily ship five stylesheets, and then a visual fix has to
land five times and drift four ways. But a library with opinionated CSS is also
one nobody can fit into their design system.

## Decision

`@select-box/styles` ships **one** `select-box.css` that every wrapper imports,
so the component looks the same whichever wrapper rendered it. The sheet owns
structure — layout, geometry, states — and takes every colour, radius and shadow
from `--sb-*` custom properties. Theming is redefining tokens, never overriding
rules.

Whether a part applies is stated in the DOM before it is stated in CSS: a part
that does not apply carries `hidden`, and the stylesheet follows. State that
exists only as a CSS rule cannot be asserted outside a browser.

## Consequences

- Restyling is a token block. The docs site is exactly that — the shipped sheet
  plus a token mapping, with no structural CSS of its own.
- An arch test asserts the classes the wrappers emit and the rules the sheet
  declares are the same set, both directions. Two class names once shipped with
  no rule at all.
- Where a part sits can depend on the viewport, and that decision is behaviour,
  so the core measures and publishes the answer as a `data-select-*` attribute
  the sheet styles. The popover's side is the first: the core says `below` or
  `above`, the sheet says what each one looks like.
- Consumers who want none of our CSS skip the import and drive the controller.
- An ancestor with `overflow: hidden` clips a popover that opens upward. The
  sheet cannot reach outside the component to prevent that, so a host that wraps
  the box in a clipping container has to say so itself.
