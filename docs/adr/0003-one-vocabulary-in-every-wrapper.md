# 3. One vocabulary, in every wrapper

- Status: accepted

## Context

Each ecosystem would name these things its own way — a dropdown becomes a menu,
a popover, an overlay, depending on who is writing. Once the names diverge the
docs fragment, the tests fragment, and a consumer moving between two wrappers has
to relearn the library.

## Decision

One term per concept, used identically in props, events, snapshot fields and the
DOM contract, in all five wrappers. Names are never translated into a framework's
local habit.

| Term | Means |
|---|---|
| `popover` | The surface that opens over the page, with the search input as trigger |
| `inline` | The surface that shows every option at once, as toggleable chips |
| `option` / `group` | A selectable row, and the header rows bundle under |
| `query` | The current search text |
| `value` | The committed selection — always a string, or an array of strings |
| `root` | The outermost element we rendered |
| `controller` | The core instance driving this wrapper |
| `data-select-*` | The attribute contract every wrapper stamps on its markup |

## Consequences

- One test suite addresses five rendering models, because it addresses the
  vocabulary rather than the markup.
- Renaming a term is a breaking change in five packages at once, on purpose.
- The word for the overlay surface is **`popover`**, not `dropdown`. Consumers
  arriving from a native `<select>` may expect the latter.
