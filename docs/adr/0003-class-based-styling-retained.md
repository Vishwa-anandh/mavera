# ADR-0003: Keep Mavera's class-based stylesheet and palette

Status: accepted
Date: 2026-10-12
Owners: Mavera front end

## Context

Consultant Pulse styles components only with Tailwind utilities (Preflight off) over a small set of
semantic tokens, and its architecture check rejects any other CSS. Mavera's UI is specified by
[`MAVERA_DESIGN_SYSTEM.md`](../../MAVERA_DESIGN_SYSTEM.md): its own blue palette, logo and component
contract, implemented as ~3,400 `mv-*` class usages and a single 1,250-line stylesheet.

## Decision

Adopt the reference's **architecture, structure and enforcement**, not its styling engine or palette.
Mavera keeps `src/styles/app.css` (+ `fonts.css`), its `--mv-*` tokens and its colours. The checker
therefore allows exactly those two CSS files, and still requires a dark-theme block, reduced-motion
handling and keyboard focus styles.

## Alternatives considered

- Convert every component to Tailwind utilities. Rejected for now: it restyles the whole product,
  has a high visual-regression risk and would contradict the design system that CLAUDE.md names as
  the source of truth. It can be revisited feature by feature.
- Adopt the Consultant Pulse navy palette. Rejected: Mavera's identity is defined in the design system.

## Consequences

Engineers will find the same folders and checks in both products but different component styling.
Reference rules about sentence-case-only text and Tailwind-only styling are intentionally not enforced here.
