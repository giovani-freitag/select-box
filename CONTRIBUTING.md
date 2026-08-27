# Contributing

## Getting the workspace running

```bash
pnpm install          # every workspace
pnpm build            # packages + docs site (turbo, cached)
pnpm test             # vitest: unit, per-wrapper integration, parity
pnpm typecheck        # tsc --noEmit everywhere, astro check on the docs
pnpm lint             # eslint
pnpm e2e              # playwright, five wrapper columns
pnpm e2e:docs         # playwright over the built docs demos
```

Narrower loops:

```bash
pnpm --filter @select-box/core test
pnpm --filter @select-box/docs-starlight start
pnpm --filter @select-box/e2e exec playwright test --project=vue
pnpm --filter @select-box/e2e exec playwright test --headed
```

`pnpm e2e` builds first on purpose: the fixtures import the built packages, so
the browser exercises what a consumer installs rather than the source tree.

## Where a change belongs

Behaviour every wrapper owes its users equally goes in `packages/core`, and its
test goes in the shared parity list under `tooling/parity/` — never hand-written
five times. Only what is genuinely specific to one binding belongs in that
wrapper's own `tests/`. The reasoning is in
[ADR 8](docs/adr/0008-tests-prove-every-wrapper-has-every-feature.md); the rest of the design is in
[docs/adr/](docs/adr/).

Anything a wrapper renders is addressed through the `data-select-*` attribute
contract, never through CSS classes or framework internals. That contract is
what lets one spec drive five rendering models.

## Code conventions

These apply by default; a deviation needs a comment saying why.

- **Meaningful names.** No abbreviations. An identifier reads as a phrase. Loop
  counters and established acronyms (DOM, HTML, ARIA) are the only exceptions.
- **One typed config object** as a constructor argument, named `<ClassName>Config`.
  Collaborators are injected through it, never constructed inside. Booleans are
  never positional.
- **Two-phase initialization.** A class that touches the DOM, listeners or I/O
  keeps its constructor config-only and does the work in `init` / `attach`.
  `destroy` pairs it.
- **Flat method bodies.** Extract closures to named methods. Event-driven
  classes use paired `listen()` / `unlisten()` with stable references.
- **Fields private by default**, state read through `getState()`.
- **Errors are thrown**, never returned as a result wrapper.
- **Comments in English.** Public surfaces get a docblock; inline comments
  explain a non-obvious *why* and never restate the code.

## Commits and releases

Commit messages are [Conventional Commits](https://www.conventionalcommits.org),
one line, imperative, no scope. Only `feat:`, `fix:` and breaking changes cut a
release; `chore:`, `docs:`, `test:`, `ci:`, `refactor:` and `perf:` land without
one.

Releases are automated and cover the workspace as a unit: release-please keeps a
release PR open against `main`, and merging it stamps one new version into every
package, updates the changelog and cuts a single tag. A package with no changes
still bumps — the version identifies a tested combination, not a diff.

### The 0.x line

The project is in beta and stays on `0.x` until someone decides otherwise. A
breaking change therefore bumps the **minor**, not the major: `feat!:` takes
`0.2.0` to `0.3.0` rather than promoting to `1.0.0`. That is `bump-minor-pre-major`
in `release-please-config.json`, and it is deliberate — without it a single `!`
would ship a stable-looking version by accident.

Going `1.0.0` is a decision, made by removing that flag, not something a commit
message should be able to trigger.
