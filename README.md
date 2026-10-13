# Mavera

AI cloud intelligence platform (Protect · Optimize · Govern) — SAP Monitoring, Cloud Cost and IDoc
Monitoring in one subscription-based application. Powered by Maitsys.

This repository is the web front end. Architecture and rules: [`docs/architecture.md`](docs/architecture.md)
and [`rule.md`](rule.md). UI contract: [`MAVERA_DESIGN_SYSTEM.md`](MAVERA_DESIGN_SYSTEM.md).

## Stack

React 19 · TypeScript 5 · Vite 7 · React Router 7 · Recharts · axios · Vitest + Testing Library.
Styling is a single class-based stylesheet with `--mv-*` tokens ([ADR-0003](docs/adr/0003-class-based-styling-retained.md)).

## Folder map

```text
src/
  app/          composition: config, providers, router (route manifest), layouts, errors
  features/     one folder per capability, each with a public index.ts
  shared/       product-neutral ui, domain rules, lib, theme, types
  data-access/  REST clients behind one public index.ts
  demo/         seeded fixtures — delete when every area has a repository
  styles/       global stylesheet and fonts
docs/           architecture, ADRs
tools/          architecture check and its baseline
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run verify` | Lint, typecheck, architecture check, tests, production build |
| `npm run check:architecture` | Boundary rules only |
| `npm run lint` · `npm run typecheck` · `npm test` | Individual gates |
| `npm run build` · `npm run preview` | Production build and local preview |

## Configuration

Copy `.env.example` to `.env.local`. `VITE_API_URL` is the API base URL including its path prefix (for example `http://localhost:8080/api`). Browser variables are public;
never put a secret in a `VITE_*` value.
