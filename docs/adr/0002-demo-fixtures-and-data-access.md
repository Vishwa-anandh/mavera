# ADR-0002: Demo fixtures live in `src/demo`; repositories are the next step

Status: accepted (time-boxed migration)
Date: 2026-10-12
Owners: Mavera front end

## Context

Consultant Pulse hides fixtures behind repository contracts, so going live means implementing REST
repositories and deleting `src/demo`. Most Mavera pages were built against mock data imported
directly (`MOCK_AZURE_ACCOUNTS`, `MOCK_SAP_SYSTEMS`, …) and only the dashboard and authentication
talk to the API through hooks.

## Decision

1. All seeded data is physically under `src/demo/<area>/` and may import only **types** from features.
2. Features still import those fixtures directly. That debt is recorded, not hidden:
   `tools/architecture-baseline.json` lists every file that does so (44 today).
3. The architecture check is a **ratchet**: a new importer fails the build, and a file that stops
   importing demo data must be removed from the baseline.
4. Pure rules needed by both fixtures and features (billing pricing and derivations) live in
   `src/shared/domain`, so fixtures never execute feature code.

## Next step (owner: Mavera front end)

Replace each baselined import with a contract in `src/data-access` and a hook in the owning feature's
`model/`, deleting the entry from the baseline in the same change. The baseline must reach zero before
`src/demo` is deleted for go-live. Server state continues to use the existing hooks; per `rule.md` §12
exactly one server-state engine (TanStack Query recommended) must be chosen by a new ADR before the
first repository hook is added.

## Security and data impact

None: fixtures are public sample data. `VITE_*` variables are public; secrets never belong in the bundle.

## Verification

`npm run check:architecture` fails on a new `demo/` importer and on a stale baseline entry.
