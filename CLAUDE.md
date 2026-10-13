# Mavera

**Product:** Mavera — AI Cloud Intelligence Platform (Protect · Optimize · Govern)
**Required attribution:** Powered by Maitsys
**Reference implementation:** React, TypeScript, Ant Design 6.x

## Design system

For all Mavera UI work, follow [MAVERA_DESIGN_SYSTEM.md](MAVERA_DESIGN_SYSTEM.md). Use its shared tokens, component states, page specifications, accessibility rules and subscription behaviour. Record deliberate deviations in the change description.

Brand artwork source: [assets/brand/mavera-logo.png](assets/brand/mavera-logo.png) (full lockup) and [assets/brand/mavera-emblem.png](assets/brand/mavera-emblem.png) (emblem only, used for the favicon and compact header mark) — see design system section 2.2 for logo/wordmark usage rules.

## Architecture

Structure, boundaries and checks follow the Maitsys standard in [rule.md](rule.md), laid out as in Consultant Pulse: `src/app`, `src/features/<name>` (with a public `index.ts`), `src/shared`, `src/data-access`, `src/demo`. See [docs/architecture.md](docs/architecture.md) and the ADRs in [docs/adr](docs/adr).

- Run `npm run verify` (lint, typecheck, architecture check, tests, build) before handing off.
- New routes go in `src/app/router/route-manifest.ts`; features import each other only through `index.ts`; the API is reached only through `src/data-access`; `import.meta.env` is read only in `src/app/config/environment.ts`.
- Do not add imports of `src/demo` fixtures to features: `tools/architecture-baseline.json` is a ratchet that may only shrink (see ADR-0002).
- Styling stays in `src/styles/app.css` with `--mv-*` tokens; Mavera deliberately does not use the reference's Tailwind-only approach (ADR-0003).
