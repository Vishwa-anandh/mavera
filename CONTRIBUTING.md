# Contributing to Mavera

## Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Required check

Before handing off a change:

```bash
npm run verify
```

Read [`rule.md`](rule.md), [`docs/architecture.md`](docs/architecture.md) and the ADRs before adding a
feature, route, state store, API adapter or persistence mechanism. For UI work follow
[`MAVERA_DESIGN_SYSTEM.md`](MAVERA_DESIGN_SYSTEM.md) and record deliberate deviations in the change description.

## Feature workflow

1. Put the page, model hook and components under the owning `src/features/<feature>` folder
   (`pages/`, `model/`, `components/`).
2. Export only what other features or `app/` need from the feature's `index.ts`.
3. Register the path in `src/app/router/route-manifest.ts` (`appPaths`, then a manifest entry with its
   access and layout) and add the page in `AppRoutes.tsx`. Menu entries live in `navConfig.ts`.
4. Reach the API through `src/data-access` (its `index.ts`). Do not call `fetch` or `axios` from features.
5. Do not add a new feature import of `src/demo` fixtures: add a repository instead
   ([ADR-0002](docs/adr/0002-demo-fixtures-and-data-access.md)).
6. Handle loading, error, empty, denied and success states, and test both allowed and denied behaviour.
7. Use the shared `--mv-*` tokens; do not hard-code colours.

Pure rules used by both fixtures and features belong in `src/shared/domain`. Runtime configuration is
read only in `src/app/config/environment.ts`.
