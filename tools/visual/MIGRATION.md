# Migrating Mavera's styling from `src/styles/app.css` to Tailwind

Goal: every component styles itself with Tailwind utilities in its own JSX; `app.css` ends up empty (then deleted).
Nothing may change visually. Pages, themes (light and dark), breakpoints and interaction states must look identical.

## How the two systems coexist
`src/styles/tailwind.css` is the entry point. Layer order is `theme, legacy, utilities`: the old stylesheet is in `legacy`,
so **a Tailwind utility always beats an old `.mv-*` rule**, whatever the selector specificity. (Exception: legacy
`!important` rules beat utilities. When one fights you, find it with grep and tell the lead rather than fighting it.)
No Tailwind preflight is loaded; element defaults still come from the legacy file until it is deleted.

## Tokens (see the `@theme` block in `tailwind.css`)
Colours: `bg-canvas|surface|surface-subtle|surface-hover|surface-pressed|elevated|card|selected|primary|action|danger|success|warning|info`,
`text-ink|ink-secondary|ink-muted|ink-disabled|primary|danger|success|warning|info|on-primary|on-action`,
`border-line|line-control|divider`. They are CSS variables, so light/dark switch automatically: **do not add `dark:` variants
for colours that already come from a token.** Use `dark:` (keyed off `[data-theme=dark]`) only where the legacy CSS had a
dark-only rule. `shadow-lift`, `rounded-xs|sm|md|lg` (0.25 / 0.5 / 0.75 / 1 rem), `font-body|heading|mono`.
Everything is `rem`; the root font size is fluid, so sizes scale with the viewport. **Never use `px` for sizes** (1px
hairlines are fine). Tailwind's spacing scale is `0.25rem` per step, so `p-4` = 1rem. Off-scale values use arbitrary
values: `text-[0.8125rem]`, `min-h-[2.375rem]`. Existing CSS variables work: `min-h-[var(--mv-control-h)]`, `p-[var(--mv-gap)]`.
Breakpoints: legacy media queries are in `px` (`680px`, `1100px`, ...). Use arbitrary variants to match them exactly:
`max-[680px]:p-3`, `min-[1100px]:grid-cols-3`. Do not use Tailwind's default `sm/md/lg`.

## Method, per file
1. Read the component, then the legacy rules for every `mv-*` class it uses:
   `python -I tools/visual/rules.py mv-panel mv-kpi` prints every rule that mentions a class, including media queries
   and contextual ones. **The effective style is the whole cascade** (later rules and `.mv-content .x` rules win), not just the first rule.
2. Replace `className="mv-..."` with utilities, and replace inline `style={{...}}` with utilities too (keep `style` only for
   values computed at runtime, e.g. a width taken from data, or a CSS variable set from props).
3. Rules that depended on a parent or sibling (`.mv-panel--table > .mv-pagination`, `.mv-kpi-row-4 > .mv-kpi + .mv-kpi`,
   `:has()`, `:nth-child`) move to the element that owns the relationship: `*:`/`[&>*]:`/`has-[]:`/`in-[]:`/`data-[slot=...]:` variants,
   or a prop on a small component. Prefer a `data-slot="name"` attribute on children that a parent styles.
4. Pull a repeated visual unit into a component in `src/shared/ui` instead of repeating a 200-character class string more
   than ~3 times. Keep components small and typed.
5. Only delete a rule from `app.css` when **no** file uses the class any more (`grep -rn "mv-foo" src`). Dead legacy rules are harmless;
   leaving them is better than breaking another file. (The lead does the final sweep.)
6. JS that selects by class (`querySelector('.mv-x')`, `closest`) must move to data attributes. Tests that query by `mv-*`
   class must be updated to query by role/text.

## Proving it (mandatory before you report done)
Two dev servers run: the baseline (last good commit) on `:5174` and the working tree on `:5173`.
```
MSYS_NO_PATHCONV=1 python -I tools/visual/cdiff_all.py light 1440 /route /other-route   # element-level computed-style diff
MSYS_NO_PATHCONV=1 python -I tools/visual/cdiff_all.py dark 1440 /route
MSYS_NO_PATHCONV=1 python -I tools/visual/cdiff_all.py light 390 /route                 # phone width
python -I tools/visual/vdiff.py light member        # full-page pixel diff of every route
```
`cdiff` names the exact element, class and CSS property that differs. Iterate until it prints `OK` for every route you own,
in light and dark, at 1440 and 390. Then `npm run verify` must pass (lint, types, architecture check, tests, build).
States the scripts do not cover (hover, focus, open dropdowns/dialogs/drawers, validation errors, empty states) must be checked by
reasoning from the legacy rules; use a Playwright script for the important ones.
Do not edit files outside your assignment, `tailwind.css`, or `app.css` (except to delete a rule you have proven dead).
