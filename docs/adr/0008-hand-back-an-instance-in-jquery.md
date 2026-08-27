# 8. The jQuery plugin hands back an instance, not method strings

- Status: accepted
- Date: 2026-08-26

## Context

jQuery is the only wrapper with no framework object to hand back. The classic
plugin convention — `$(el).selectBox('open')` — is a stringly-typed dispatcher:
unreachable by TypeScript, undiscoverable in an editor, and a typo silently
becomes a config object that tears the live widget down.

## Decision

`$(el).selectBox(config)` returns the `SelectBoxView` itself and hangs it off the
element. Two doors reach the same object, differing only in type:

| Door | Shape | Typed as |
|---|---|---|
| The call | `$(el).selectBox(config)` | `SelectBoxView<TExtra>` — everything |
| The element | `el.selectBox` | `SelectBoxElementHandle` — the `TExtra`-free members |

A global `HTMLElement` property cannot carry a type parameter, so the element
door publishes only the members whose signatures never mention `TExtra`.
`controller` and `setOptions` are deliberately absent there: at `TExtra = object`
they would accept option lists the typed door rejects.

## Consequences

- **Init is no longer chainable.** Bind events before initialising:
  `$(el).on('change', …).selectBox(config)` reads left to right, but the
  `selectBox` call must come last.
- **An empty collection throws** `EmptySelectionError` — there is no honest
  instance to return, and it nearly always means the selector was wrong.
- **A multi-element collection builds one view per element** and returns the
  first; the rest are reached through their own `element.selectBox`.
- **Re-initialising destroys the previous view first**, then advertises the new
  one.
- **A legacy method-string call throws** `LegacyMethodCallError` naming the
  method that moved. Types alone cannot stop an untyped caller, and spreading a
  string as a config would silently mount an empty widget over a live one.
- Form reset reaches the controller through a **document-level** listener rather
  than one on the form: the view is built before its root is in the tree, so the
  mirror has no form owner yet. The listener filters by asking the resetting form
  whether the mirror is one of the controls it owns.
