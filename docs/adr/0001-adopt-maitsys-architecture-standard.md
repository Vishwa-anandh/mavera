# ADR-0001: Adopt the Maitsys architecture standard

Status: accepted
Date: 2026-10-12
Owners: Mavera front end

## Context

Mavera grew as a flat prototype: `layout/`, `components/`, `context/`, `api/`, `lib/` beside `features/`, with
mock data next to the pages that used it, shared widgets living inside `dashboard`, and an
`invoiceBuilder` ⇄ `billing` import cycle. Consultant Pulse and KC Safety already follow one
standard ([`rule.md`](../../rule.md)); engineers moving between the products had to relearn the layout.

## Decision

Mavera uses the same layout, boundaries and checks as Consultant Pulse:

| Folder | Owns |
|---|---|
| `src/app` | Composition only: `config/environment.ts`, `providers/`, `router/` (route manifest, navigation), `layouts/`, `errors/` |
| `src/features/<name>` | One business capability, with `pages/`, `components/`, `model/` and a public `index.ts` |
| `src/shared` | Product-neutral UI, pure domain rules (`shared/domain`), helpers, theme |
| `src/data-access` | The REST client and the only public entry (`index.ts`) to it |
| `src/demo` | Seeded fixtures; deleting it must be the step that takes the app live (see ADR-0002) |
| `src/styles` | The global stylesheet and fonts (see ADR-0003) |

`tools/check-architecture.mjs` enforces the boundaries and runs in `npm run verify`.

## Alternatives considered

- Keep the flat layout and add only documentation. Rejected: nothing would stop the drift that caused the cycle.
- Split into a monorepo of packages. Rejected: `rule.md` §3 says not to create packages without an independent consumer.

## Consequences

- Cloud providers (`azure`, `aws`, `gcp`, `btp`) are separate features that share the cloud overview through `features/cloud`.
- `invoiceBuilder` is part of `billing`; billing's pure pricing and derivation rules live in `shared/domain/billing`
  because fixtures and several features need them.
- Cross-feature imports go through `index.ts`; a value-level cycle between features fails the check.

## Verification

`npm run verify` (lint, typecheck, architecture check, tests, build). `src/app/router/route-manifest.test.ts`
proves every navigation destination is a registered route.
