# 7. Virtualize through @tanstack/virtual-core

- Status: accepted
- Date: 2026-08-26

## Context

A select box has to survive lists in the tens of thousands without painting
them. Every framework has a good virtualizer; none of them is framework-neutral,
and picking five would put five different scroll behaviours in one library.

## Decision

`SelectBoxListVirtualizer` in the core wraps `@tanstack/virtual-core` — the
framework-agnostic package that every official TanStack adapter wraps. It owns
the internal `_didMount` / `_willUpdate` lifecycle, so wrappers only call
`mount`, `sync` and `dispose`, and pass `measureElement` to each rendered row.

Group headers are fixed-size rows interleaved with option rows; the row index to
group-and-option mapping lives in core, so the same row model drives keyboard
navigation and the virtualizer and the two cannot disagree about which rows are
skippable.

## Consequences

- Variable row heights work through the library's own `ResizeObserver`
  measurement. No inline `style.height` is forced onto an option.
- The core takes a runtime dependency, which is otherwise something it avoids.
- Sticky group headers during scroll stay a wrapper concern, in CSS.
- The browser matrix carries a 10 000-option column, because a windowed DOM and
  a full-list scroll range are not observable in JSDOM.
