# Architecture decisions

The principles this library is built on — one page each, with what the choice
costs. If the code and a record disagree, one of them is a bug.

| # | Decision |
|---|---|
| [1](0001-every-business-rule-lives-in-the-core.md) | Every business rule lives in the core |
| [2](0002-render-separates-from-logic-per-framework-idiom.md) | Rendering separates from logic, the way each framework does it |
| [3](0003-one-vocabulary-in-every-wrapper.md) | One vocabulary, in every wrapper |
| [4](0004-two-surfaces-popover-and-inline.md) | Two surfaces: popover and inline |
| [5](0005-addons-change-behaviour-without-touching-the-core.md) | Addons change behaviour without touching the core |
| [6](0006-behave-like-a-native-form-control.md) | Behave like a native form control |
| [7](0007-one-stylesheet-the-same-look-everywhere.md) | One stylesheet, the same look everywhere |
| [8](0008-tests-prove-every-wrapper-has-every-feature.md) | Tests prove every wrapper has every feature |

## Writing a new one

Number it next, keep it to context / decision / consequences, and say what the
decision **costs** — a record with no consequences is a sales pitch. Reach for a
Mermaid diagram when the decision is a flow; skip it when prose is shorter.
