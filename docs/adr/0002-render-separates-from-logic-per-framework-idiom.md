# 2. Rendering separates from logic, the way each framework does it

- Status: accepted

## Context

Logic and rendering must be separable in every wrapper — otherwise the only way
to use the library is to accept our markup. But "separated" looks different in
each ecosystem, and forcing one shape on all five would make four of them feel
foreign.

## Decision

Every wrapper exposes the same two things under its own idiom: the **state** and
the **controller**. Consumers reach them through whatever their framework already
uses for this.

| Wrapper | How logic is reached |
|---|---|
| React | `useSelectBox()` hook |
| Vue | `useSelectBox()` composable |
| Lit | `SelectBoxController`, a reactive controller you host |
| Web Components | `element.controller` |
| jQuery | `box.controller`, on the instance the plugin returns |

Each wrapper ships two tiers: a styled component for the common case, and the
headless access above when it is not enough. Both drive the same controller.

## Consequences

- A consumer never learns our abstraction — they use their framework's.
- The styled component stays declarative; the controller is the escape hatch,
  and reaching for it does not mean leaving the wrapper.
- The two wrappers that build DOM by hand — web components and jQuery — share
  `@select-box/dom`, so a row, a chip or a virtualized list is written once
  rather than twice.
