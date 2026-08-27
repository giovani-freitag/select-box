# 13. Release the whole workspace as one version

- Status: accepted
- Date: 2026-08-26

## Context

The workspace holds sixteen packages — a core, six wrappers, seven addons, a
shared stylesheet and a shared DOM layer — but they are one library. A wrapper
is meaningless without the core version it was built against, and an addon
speaks a hook contract the core defines. Independent per-package versioning
would let a consumer assemble a combination we never tested.

## Decision

Versions are cut by release-please from Conventional Commits on `main`, and
every package carries the same version.

```mermaid
flowchart LR
    commits["conventional commits on main"] --> pr["release-please keeps a release PR open"]
    pr --> merge["merge the PR"]
    merge --> stamp["one version stamped into every package.json"]
    stamp --> release["tag, GitHub release and CHANGELOG"]
```

Mechanically this is a single release-please component at the repository root,
with the workspace manifests listed as `extra-files` so their `version` fields
are rewritten in lockstep. One tag, one changelog, one release.

The project starts at **0.1.0**. The API is still moving, and semver's `0.x`
rule — breaking changes bump the minor — describes that honestly.

## Consequences

- One `CHANGELOG.md` and one `vX.Y.Z` tag per release, instead of sixteen of
  each.
- A package with no changes in a release still bumps. That is the point: the
  version identifies a tested combination, not a diff.
- Nothing is published to a registry yet — packages stay `private`, so a release
  is a tag and a changelog. Turning publication on is adding a publish job that
  reacts to the release, not a re-architecture.
- Commit types matter: only `feat:`, `fix:` and breaking changes move the
  version. `chore:`, `docs:`, `test:`, `ci:`, `refactor:` and `perf:` land
  without cutting a release.
- Splitting into independent versions later means promoting each package to its
  own release-please component. The tag format would change, which is a one-time
  cost paid deliberately.
