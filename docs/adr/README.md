# Architecture decisions

Short records of the choices that shape this library — the context that forced
each one, what was decided, and what it costs. They are the design spec: if the
code and a record disagree, one of them is a bug.

| # | Decision | What it settles |
|---|---|---|
| [1](0001-framework-agnostic-core-with-thin-wrappers.md) | A framework-agnostic core with thin wrappers | Where behaviour lives, and what a wrapper is allowed to be |
| [2](0002-one-controller-with-a-pluggable-selection-driver.md) | One controller, cardinality behind a driver | Single vs multi, `value: string`, where interaction is refused |
| [3](0003-addons-as-pure-transformer-hooks.md) | Addons are pure transformers | The extension contract, and why reentrancy cannot happen |
| [4](0004-share-one-set-of-light-dom-painters.md) | One set of light-DOM painters | How the two imperative wrappers stop duplicating markup |
| [5](0005-reach-forms-through-a-native-control.md) | Reach forms through a native control | Submission, validation and `required`, per wrapper kind |
| [6](0006-restore-the-default-on-form-reset.md) | Reset restores the default | Why `reset()` and `clear()` are different operations |
| [7](0007-virtualize-through-tanstack-virtual-core.md) | Virtualize through `@tanstack/virtual-core` | Large lists, row measurement, and the shared row model |
| [8](0008-hand-back-an-instance-in-jquery.md) | jQuery hands back an instance | The plugin API, and what broke to get there |
| [9](0009-layer-the-test-suites.md) | Layer the suites, share one scenario list | How five wrappers are kept from drifting |
| [10](0010-route-the-e2e-columns-from-tested-code.md) | Route the E2E columns in tested code | Which browser columns a change has to pay for |
| [11](0011-render-the-docs-demos-as-astro-islands.md) | Docs demos are real islands | Why there is no iframe on the docs site |
| [12](0012-ship-one-stylesheet-driven-by-tokens.md) | One stylesheet, themed through tokens | What the CSS owns and how it is restyled |
| [13](0013-release-the-workspace-as-one-version.md) | Release the workspace as one version | Versioning, changelog and what a release means |

## Writing a new one

Number it next in sequence, keep it to context / decision / consequences, and
say what the decision **costs** — a record with no consequences section is a
sales pitch. Reach for a Mermaid diagram when the decision is a flow or a
dispatch; skip it when prose is shorter.
