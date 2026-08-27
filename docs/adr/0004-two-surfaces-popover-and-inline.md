# 4. Two surfaces: popover and inline

- Status: accepted

## Context

Two shapes cover almost every real use. One is a native `<select>` with the
things a native `<select>` never got — search in the trigger, disabled options,
group headers, lists too long to paint. The other is a picker where every option
is visible at once, the way a button group reads.

## Decision

A `surface` flag chooses between them, and it is **orthogonal** to `mode`, so
single and multi work in both. It is mutable at runtime.

| `surface` | Looks like | Adds over the native equivalent |
|---|---|---|
| `"popover"` | A `<select>` dropdown | Search inside the trigger, highlighted matches, disabled options and groups, keyboard nav that skips both, windowed rendering for very long lists |
| `"inline"` | A button group | Every option visible and toggleable, no overlay to open |

Long lists are only a popover concern, and are handled by measured
virtualization over `@tanstack/virtual-core` — variable row heights included, so
no option is forced to a fixed height.

## Consequences

- Both surfaces run the same scenario list, rather than one being the tested one
  and the other the afterthought.
- Switching surfaces at runtime mounts a different root element, so `root` is
  published as a getter everywhere — a captured node would dangle.
- Virtualization means the DOM holds a window, not the list. Anything that reads
  the full option set must read the snapshot, not the markup.
