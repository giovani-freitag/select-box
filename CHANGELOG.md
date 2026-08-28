# Changelog

## [0.2.0](https://github.com/giovani-freitag/select-box/compare/v0.1.0...v0.2.0) (2026-08-28)


### ⚠ BREAKING CHANGES

* free the shared controller name in the lit package
* name the selection flag multiple and the seeded value defaultValue everywhere
* bind with v-model in vue and report every change through one event
* let the owner set a value on every wrapper, even while it refuses input

### Features

* accept a controlled value on the react select box ([d769c5d](https://github.com/giovani-freitag/select-box/commit/d769c5d954f540b05120efe0a5636bbc58ef15ce))
* add a playground that configures a select box with select boxes ([92287e1](https://github.com/giovani-freitag/select-box/commit/92287e158ca21c3ffa546e8e2cbab9ae3bef4415))
* bind with v-model in vue and report every change through one event ([cea62da](https://github.com/giovani-freitag/select-box/commit/cea62da5e84ffd4556d6586446940c1422219a67))
* lay the playground knobs out as chips instead of dropdowns ([3dec332](https://github.com/giovani-freitag/select-box/commit/3dec332f800380cabd4f52563cfecd186474e087))
* let a label, a form library and a stylesheet reach the react component ([31f188d](https://github.com/giovani-freitag/select-box/commit/31f188d203f2ca48299e9a42ba68d7cfbd74480a))
* let the caller supply the empty-state text in every wrapper ([c7dfd01](https://github.com/giovani-freitag/select-box/commit/c7dfd01399390f753ff6ac1788ee2e2f2a27e95c))
* let the owner set a value on every wrapper, even while it refuses input ([cfe74f0](https://github.com/giovani-freitag/select-box/commit/cfe74f0388b32382f91654a434a9b83aa0308cc6))
* make the wrapper packages publishable, behind a switch that is still off ([427d66c](https://github.com/giovani-freitag/select-box/commit/427d66c649a335f3f6a6ea499797fc5b50ff4705))
* name the selection flag multiple and the seeded value defaultValue everywhere ([342e396](https://github.com/giovani-freitag/select-box/commit/342e396e3ef84112fd87aa4d7fba22e5a9c1b06d))
* open the popover upward when the list would not fit below ([de37a34](https://github.com/giovani-freitag/select-box/commit/de37a34c92b2b067054f507c21c8fd73ff3b879b))
* report the popover opening and closing in every wrapper ([a664c43](https://github.com/giovani-freitag/select-box/commit/a664c43edb2217d0f5ba594f85fb043e2bbfaf60))
* seed the custom element's selection from a value attribute in markup ([991324d](https://github.com/giovani-freitag/select-box/commit/991324d9e58f45b9e23761fd2de936520dd5252d))
* type the mode as a generic so a runtime switch compiles, and warn on silent prop pairs ([f7024b1](https://github.com/giovani-freitag/select-box/commit/f7024b1f880e24a687badea342105ca857d7b13e))


### Bug fixes

* announce option groups to assistive technology, as optgroup parity promises ([c1f2102](https://github.com/giovani-freitag/select-box/commit/c1f2102fac758812b6b72f34900fa6b7df3621d4))
* build the docs site's dependencies before typedoc reads them ([1513d11](https://github.com/giovani-freitag/select-box/commit/1513d11e055585cf0980727166831c86ec999d22))
* carry the pnpm settings into the workspace file that supersedes npmrc ([d7e8ce8](https://github.com/giovani-freitag/select-box/commit/d7e8ce8d663835c46e3560412385b0ee90e3a52b))
* compare a multi selection by its keys so an unchanged commit stays quiet ([4efe79b](https://github.com/giovani-freitag/select-box/commit/4efe79b58883c57b7f3cf4941a9529324096ca43))
* declare the core as a peer everywhere so only one copy is ever installed ([77cd367](https://github.com/giovani-freitag/select-box/commit/77cd36733aa4d53af7ba7789c30e44d7f826f6c2))
* free the shared controller name in the lit package ([c4384e3](https://github.com/giovani-freitag/select-box/commit/c4384e3dca2270cd30527d3e76f3d882d48cf72d))
* give the landing page back the full width of the shell ([b334ab8](https://github.com/giovani-freitag/select-box/commit/b334ab8d5b2f7cfef4ca8c47e7fc89dd3dd6f533))
* hand a commonjs consumer its own type declarations ([df88a6e](https://github.com/giovani-freitag/select-box/commit/df88a6ef61322ee02b4bb6d159aeb519b8d94ace))
* honour a selection the option list could not answer yet ([8c74276](https://github.com/giovani-freitag/select-box/commit/8c742766ff2b76eb663107c4eeb12e48333946a3))
* keep breaking changes on the minor while the project is pre-1.0 ([482700b](https://github.com/giovani-freitag/select-box/commit/482700baae9f7adc95ea1a1cf38594a4b0150451))
* keep every row in the virtualized list, including the first ([8e709e8](https://github.com/giovani-freitag/select-box/commit/8e709e8e52352576b270d8b0c3f5f0d270c0756e))
* let packageManager pin pnpm so the setup action stops refusing both ([561266f](https://github.com/giovani-freitag/select-box/commit/561266fddabca390acbc52bf2fe4657673d36823))
* let the two custom elements survive being moved and reconfigured ([fcdfc19](https://github.com/giovani-freitag/select-box/commit/fcdfc1943405ea7c362489de579cdfbcecd60c69))
* lint the vue single-file components, which no config was matching ([7d9e492](https://github.com/giovani-freitag/select-box/commit/7d9e492f7c457f46a2036dbac4d006e4fcce3309))
* make the clear control, the field name and a custom message behave in every wrapper ([8647e4c](https://github.com/giovani-freitag/select-box/commit/8647e4cd24c02ee60a9600b509c11928f0f0a6a9))
* mirror only the selection into the form, not the whole option list ([5296a7f](https://github.com/giovani-freitag/select-box/commit/5296a7f68954791e15ecac280e12048512c01100))
* move the pnpm settings where pnpm actually reads them ([ea3206d](https://github.com/giovani-freitag/select-box/commit/ea3206dd389b2b9c54387ef75e8fce6833e55716))
* opt the inline demo into multi mode with the attribute the element reads ([83c55e6](https://github.com/giovani-freitag/select-box/commit/83c55e650aaa96370432fc995f86f66586dced89))
* point the docs guard at the sub-path the built site is served under ([7c15a40](https://github.com/giovani-freitag/select-box/commit/7c15a407a686a96516998df12f4f2f400de6e888))
* publish the types the public surface already names ([ef7e3f9](https://github.com/giovani-freitag/select-box/commit/ef7e3f9f671eb2f5b6dca1a63dab71fe19968f4f))
* release every subscriber on destroy and leave the controller inert ([cf0117f](https://github.com/giovani-freitag/select-box/commit/cf0117f2799d47d53113bb821f92e7bef3b2672e))


### Performance

* let a filter strategy build its index when the options arrive ([05321c0](https://github.com/giovani-freitag/select-box/commit/05321c062b5bd0eee8ec402e82cd1b80decc23a7))
* normalize each label once per option list instead of once per keystroke ([6374bae](https://github.com/giovani-freitag/select-box/commit/6374bae4011c3e2cc1c55928d5a1ed715e12d27d))
* prepare long option lists in idle slices instead of blocking setOptions ([0553873](https://github.com/giovani-freitag/select-box/commit/0553873bc97d7f9d34ced8273190b3ae48ed6ffd))


### Refactors

* put the disabled state in aria beside the overridden option role ([996a1c9](https://github.com/giovani-freitag/select-box/commit/996a1c980f07124bda45d3b3cd9b7e1404564b3f))


### Documentation

* correct the addon options, the combobox role and the spec counts ([7cc57f2](https://github.com/giovani-freitag/select-box/commit/7cc57f2628d21a73a4bf33ee20ef682c168af871))
* correct what the docs claimed and the code never did ([2495dfd](https://github.com/giovani-freitag/select-box/commit/2495dfd27eb265e4d11879994c5bbac6ea498b1f))
* cut the padding and correct what the guides claim about the packages ([78981a0](https://github.com/giovani-freitag/select-box/commit/78981a02167458208763412850d2ac393625e696))
* document forms, the seven addons and the accessibility contract ([84729f2](https://github.com/giovani-freitag/select-box/commit/84729f200efa08602590c3e69e7cc76c686420ef))
* list the core alongside every wrapper now that it is a peer ([0165f68](https://github.com/giovani-freitag/select-box/commit/0165f68bbd90540cfbdb6588bf6c9ef7fc7ea299))
* say beta on the 0.x line instead of a version that rots ([d66e13e](https://github.com/giovani-freitag/select-box/commit/d66e13e5ab01f116391df16786ff48cadef69c85))
* show how a caller owns the selection ([d348964](https://github.com/giovani-freitag/select-box/commit/d348964f9918ec00357332dd1cbbed092addf7db))

## 0.1.0 (2026-08-26)

First public release. The library is feature-complete for single and multi
select across all five wrappers, on both the popover and the inline-chip
surface, and is versioned as `0.x` because the API is still free to move.

### Features

* A framework-agnostic `SelectBoxController` owning search, filtering,
  virtualization, keyboard navigation, ARIA wiring and the addon pipeline.
* Wrappers for React, Vue, Lit, Web Components and jQuery, all reading the same
  snapshot fields and exposing the same `root` and `controller` handle.
* Single and multi select, switchable at runtime, with cardinality delegated to
  a pluggable selection driver.
* Option groups with `<optgroup>` parity — filtered snapshots expose grouped
  rows, and keyboard navigation skips headers and disabled options.
* Native form participation on every wrapper: `disabled`, `readOnly`, `name`
  and `required`, submitted through `ElementInternals` or a mirrored native
  `<select>`.
* List virtualization over `@tanstack/virtual-core`, measured rather than
  fixed-height.
* Seven first-party addons on a complete hook surface: fuzzy filtering, hoist
  selected, clear button, create option, remove button, restore on backspace and
  persistence.
* One shared stylesheet themed entirely through `--sb-*` custom properties.

### Documentation

* An Astro + Starlight site with every wrapper rendering live on the same page,
  a TypeDoc API reference, and architecture decision records under `docs/adr/`.
