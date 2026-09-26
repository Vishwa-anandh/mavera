# Mavera Cloud Cost Monitoring — Phase 1: Foundation

**Status:** approved (chat design), pending written-spec review
**Date:** 2026-09-26
**Scope:** first of six planned sub-projects rebuilding the Cloud Cost Monitoring product on the Mavera design system

## 1. Context

### 1.1 What this project is

Maitsys operates a live product, **Cloud Cost Monitoring**, reachable at `https://ccm.maitsys.com/`. Its real frontend source (`ccm-frontend` v4.6.1) was provided at `C:\Users\vishw\Downloads\public` for reference. It is a working React 19 + Tailwind CSS app talking to a real backend at `VITE_API_URL` (`http://localhost:8080/api`), covering:

- Four cloud-provider cost modules: Azure, AWS, SAP BTP, Google Cloud — each with an overall dashboard, account/credential manager, and a detailed cost page (Executive/Operations/Technical tabs; BTP additionally has a Hierarchy tab and Service Manager sub-flow).
- Shared feature pages: Budgets & Alerts, Recommendations (with an MSP-savings model), Smart Alerts (anomaly detection with tunable thresholds), Invoices (authenticated upload/list/delete + a fully client-side, unauthenticated `/invoice-demo` parser), Sync Logs (admin), User Management (admin), Subscription Management.
- A separate super-admin portal (`sa_token`, `/admin/*` routes) with token generation, org management, MSP rate configuration, and manual backfill triggers.
- A real AI chat copilot widget, streaming against its own microservice (`VITE_AI_COPILOT_URL`), independent of the main API.

A full file-by-file inventory of this reference app (routes, components, API endpoints, context shape, dead code) was produced during design and is the working source of truth for what each rebuilt page must do. It is not duplicated in full here; implementers should re-derive detail from the reference app directly (`C:\Users\vishw\Downloads\public\src`) when building each page, cross-checked against this spec's architectural decisions.

### 1.2 Why a rebuild, and why phased

The goal is to reproduce this product's real modules, features, and flows — not invent new ones — but rebuilt on the Mavera design system (`MAVERA_DESIGN_SYSTEM.md`, imported at the repo root) using Ant Design 6.x instead of Tailwind, with Mavera's color/spacing/typography/motion tokens, component-state rules, and entitlement/locked-module visual language.

The full product is too large for one spec or one implementation pass. It is split into six sub-projects, each independently spec'd and built:

1. **Foundation** (this spec): scaffold, design tokens/theme, shared shell, auth flow, home dashboard.
2. Azure module (reference pattern for the other three clouds).
3. AWS, SAP BTP, Google Cloud modules (reusing phase 2's pattern).
4. Shared feature pages: Budgets, Recommendations, Smart Alerts, Invoices (+ public demo), Sync Logs, User Management, Subscription Management.
5. Admin portal.
6. AI chat widget.

Phases 2–6 are out of scope for this spec and this implementation pass.

### 1.3 Reconciling with MAVERA_DESIGN_SYSTEM.md §6

The design doc's shared-shell section assumes a three-module platform (SAP Monitoring / Cloud Cost / IDoc Monitoring), with Cloud Cost limited to a single Azure-only nine-page inventory (§13). Neither SAP Monitoring nor IDoc Monitoring exist as real products today, and the real Cloud Cost product is a single, self-contained four-provider application, not one of three modules in a bigger shell.

**Decision:** this build does not scaffold placeholder "SAP Monitoring" / "IDoc Monitoring" locked modules — there is no feature set to build against, and doing so would be speculative. The navigation instead mirrors the reference app's real information architecture:

```
Dashboard
Cloud Costs ▾
  Azure
  AWS
  SAP BTP
  Google Cloud
Optimisation ▾
  Recommendations
  Smart Alerts
Operations ▾
  Invoices
Governance
  Budgets & Alerts
Account
  Subscription
Administration ▾   (admin/owner only)
  User Management
  Sync Logs
```

Everything else from the design doc still applies: color/typography/spacing/motion tokens (§3–5, §10), the universal component state matrix (§4.4), component behavioral specs (§8, §15), chart rules (§9), and the entitlement/locked-module visual pattern (§7) — applied to this app's real gates (`user.canViewAzure/Aws/Btp/Gcp`, `user.role`), not to a subscription model that doesn't exist in the reference app. If Maitsys later wants Cloud Cost folded into a larger three-module Mavera platform, that is a future re-navigation, not part of this build.

## 2. Stack

| Concern | Choice | Why |
|---|---|---|
| Build tool | Vite | Matches reference app; fast iteration |
| Framework | React 19, TypeScript | Doc's stated reference implementation; reference app is JS/PropTypes — types are added, behavior is not changed |
| Routing | React Router 7, `BrowserRouter`/`Routes`/`Outlet` | Matches reference app's routing shape |
| UI kit | Ant Design 6.x | Mavera design system's reference implementation |
| Styling | Mavera design tokens via `ConfigProvider theme`; no Tailwind | Doc requires token-driven styling; Tailwind's ad hoc utility classes and hand-written `dark:` variants are the reference app's biggest styling debt |
| HTTP | axios | Matches reference app; interceptor behavior ported as-is |
| Charts | Recharts | Already used by reference app; low-level composability fits the doc's specific chart constraints (§9.1) |
| Testing | Vitest + React Testing Library | Standard Vite-ecosystem choice |

Package manager: npm (matches reference app's `package-lock.json`).

## 3. Design tokens and theming

`src/theme/tokens.ts`: typed constants transcribed from the design doc —
- Color roles (§4.1) for light and dark, keyed exactly as `--mv-*` in the doc (canvas, surface, text, primary, action, success/warning/danger/info, etc.)
- Spacing scale (§5.1), control/table dimensions (§5.2), radius/shadow (§5.3)
- Motion durations/easing (§10.2)
- Chart role colors (§9.1) — reserved for phase 2+, defined now so later phases don't redefine them

`src/theme/themeConfig.ts`: maps `tokens.ts` into AntD's `ConfigProvider theme={{ token, algorithm }}` shape, one config for light, one for dark (dark uses `theme.darkAlgorithm` as a base, then overrides with the doc's explicit dark-mode color values rather than relying on algorithmic inversion — the doc explicitly prohibits producing dark mode by inverting light).

`src/theme/ThemeProvider.tsx`: React context holding `{ mode: 'light'|'dark', density: 'comfortable'|'compact' }`, with setters that persist to `localStorage` under `mavera.theme` / `mavera.density` (doc §4.3, §5.2). Unknown/missing stored values fall back to light/comfortable. A small inline script in `index.html` reads these keys before React mounts and sets a `data-theme` attribute on `<html>`, so CSS custom properties resolve before first paint and there's no flash of the wrong theme — this is the SPA-appropriate equivalent of the doc's SSR pre-paint requirement.

**Fonts:** `@font-face` declarations are wired exactly per doc §3.2 (`Google Sans Text` 400/500/600, `Poppins` 500/600), pointing at `/fonts/*.woff2`. The actual WOFF2 files are **not** included in this build — they are not available in this environment and must be sourced/licensed separately (Poppins is OFL and readily available; Google Sans Text's redistribution terms need to be confirmed before self-hosting). Until those files are added, the CSS fallback stack (`"Segoe UI", Arial, sans-serif` / doc's documented fallback) renders instead. This is a known, tracked gap, not a silent substitution — `src/theme/fonts.css` contains a comment marking exactly where the real files go.

**Logo:** `assets/brand/mavera.png` (the full stacked lockup: emblem + wordmark + tagline) is used uncropped, at 240–320px width, on the sign-in/auth pages only (doc §2.2 "Full brand placement"). The compact header does not attempt to crop this image down to a 36×36 emblem — per the doc's own fallback rule, it renders the live-text "MAVERA" wordmark (Poppins 600 / fallback, 18/24px, 0.04em letter-spacing) instead, until a properly isolated emblem asset is produced (out of scope here — needs actual image editing, not available in this environment).

## 4. Shared shell

`src/layout/AppShell.tsx` — sticky header + content `Outlet`, composes:
- `ModuleNavigation.tsx` — AntD `Menu` (horizontal) + `Dropdown` per top-level group, rendering the nav tree in §1.3. Each item's visibility/lock state is computed from `AuthContext`'s `user.canView*`/`role`, using the doc's Locked state (§4.4) + upgrade-style tag rather than the reference app's ad hoc amber "Upgrade"/grey "Coming Soon" badges — same underlying logic (`isPrivileged(user) || user.canViewX`), new presentation.
- `ContextBar.tsx` / `Breadcrumb.tsx` — per doc §6.2/§6.3 page anatomy; minimal in phase 1 since most pages needing scope controls arrive in phase 2+.
- `ProfileMenu.tsx` — avatar, appearance (light/dark) toggle, density toggle, links to Account/Subscription, logout (confirmed via the shared confirm pattern below).
- `Footer.tsx` — "Powered by Maitsys" per doc §2.2, normal document flow.

**Modals:** one AntD `Modal`-based wrapper replaces every bespoke `createPortal` modal in the reference app. `useConfirm()` keeps its existing promise-based call signature (`const ok = await confirm({ title, description, variant })`) so call sites don't change shape when later phases port pages that use it — internally it now drives `Modal.confirm` (or a controlled `Modal` for variants needing custom content) instead of hand-rolled backdrop/portal markup.

**Toasts:** the reference app's `window.dispatchEvent(new CustomEvent('ccm:toast', ...))` pattern is kept as-is — it exists specifically so `api/index.ts`'s axios interceptors (which run outside the React tree) can raise UI feedback without importing React context into a plain module. Only the renderer changes: a `ToastListener` component subscribes to the `ccm:toast` window event and calls AntD's `message`/`notification` API (via `App.useApp()`, per doc's `C70 — App` component spec) instead of the reference app's custom toast stack.

## 5. Auth

`src/context/AuthContext.tsx` — same public shape as the reference app: `{ user, loading, isAuthenticated, login, register, logout, refreshUser, unlockAccount, sendOtp, verifyOtp }`, plus derived `invoiceOnly`, `cloudAccess`, `features`, `accountLimits`. On mount, calls `GET /auth/me`; a `subscriptionExpired` response routes to `/subscription-expired` before ever flipping `isAuthenticated` false (preserves the reference app's no-flash-redirect behavior). `login()` re-fetches `/auth/me` after `/auth/login` rather than trusting the login response's token payload, matching the reference app.

`src/api/index.ts` — axios instance with the same interceptor behavior as the reference app, ported to TS:
- Attach `Authorization: Bearer <token>` from `localStorage.token`.
- Retry network errors (no `error.response`) up to 3× with exponential backoff, skipped for `/auth/*`.
- On 401 `TokenExpired`: refresh via `POST /auth/refresh-token`, queue concurrent 401s during refresh, retry the original request; hard-logout + redirect to `/login?error=session_expired` if refresh fails.
- On 403 + `subscriptionExpired`: clear cloud-summary caches, stash `subscription` payload to `sessionStorage`, redirect to `/subscription-expired` (guarded against duplicate redirects from concurrent in-flight requests).
- On 403 + deactivated/locked message: hard-logout to `/login?error=account_deactivated`.
- Otherwise, fire a toast (via the `ccm:toast` event) for 429/500/502/503/504.

Pages, rebuilt with AntD `Form`/`Steps`/`Input.Password` in place of hand-rolled markup, same flows as the reference app:
- `LoginPage` (+ account-locked/unlock sub-flow)
- `RegisterPage` (5-step wizard: org info → personal info → password w/ strength meter → cloud-provider/invoice-only selection → plan summary)
- `ForgotPasswordPage`, `ResetPasswordPage`
- `SubscriptionExpiredPage` (plan comparison; background re-check via a raw, non-interceptor axios call to detect renewal and bounce back to `/`)
- `AuthCarousel` — reused as-is structurally (3-slide auto-rotating marketing carousel), restyled; reuses the existing `public/auth_*.png` art already present in the reference app's `public/` folder (should be copied into this project's `public/` unchanged — brand photography, not a design-system concern).

## 6. Home dashboard

`src/features/dashboard/HomePage.tsx` — same data sources as the reference app, fetched in parallel: `GET /summary/dashboard`, `GET /recommendations`, `GET /smart-alerts?pageSize=10`, `GET /budgets`, `GET /insights/msp-savings`, `GET /invoices?pageSize=500`. Same permission-flag derivation (`canViewX`/`XReadOnly`/`canWriteX`/`allowConnectX`, invoice-only/hybrid-org logic) ported from the reference app's inline block into a small typed helper (`derivePermissions(user)`) so it isn't duplicated per page later.

Rebuilt with AntD `Card`/`Statistic`/`Table` for KPIs and breakdowns, Recharts for trend charts, following doc §8.4/§8.6/§9 (units/period always shown, missing values render as an explicit "Unavailable" em dash rather than zero, no fabricated forecasts). The reference app's inline onboarding wizard (connect first Azure/AWS account from the dashboard) is preserved as a flow, restyled with AntD `Steps`.

## 7. Shared state/error primitives

Introduced now so phases 2–6 don't re-invent them per page (this is the one deliberate improvement over the reference app, which reimplements loading/empty/error markup independently on every page):
- `EmptyState` — icon + heading + explanation + optional action (doc §8.5 `Empty`/`Result`).
- `DataFreshness` — absolute + relative last-updated display (doc §8.6).
- `StatusTag` — semantic-colored text-only tag (doc §8.4 `Tag`), used for connection/sync/lifecycle states.

These are primitives only in phase 1 (built, unit-tested, not yet consumed by real data tables — those arrive with phase 2's Azure module).

## 8. Testing

- `api/index.test.ts` — interceptor behavior: token-refresh queue/coalescing, retry/backoff count and skip-list, subscription-expiry redirect + dedupe guard, deactivated-account hard logout.
- `AuthContext.test.tsx` — mount behavior (`/auth/me` call, subscriptionExpired short-circuit), `login`/`logout` cache-clearing side effects.
- Smoke tests (render + loading/empty/error variants) for: `AppShell`, `ModuleNavigation` (lock/upgrade rendering per permission combination), each auth page, `HomePage`.
- No exhaustive TDD-per-component; this is UI-heavy exploratory work where full test-first would be disproportionate. The plan should call out these specific units as test-first candidates (interceptor logic and permission derivation are pure logic and benefit most from tests written before implementation).

## 9. Explicit non-goals for this phase

- No Azure/AWS/BTP/GCP pages (phase 2–3).
- No Budgets/Recommendations/Smart Alerts/Invoices/Sync Logs/User Management/Subscription Management pages (phase 4) — `/subscription` route exists as a stub only if needed for nav-link testing, not a built page.
- No admin portal (phase 5).
- No AI chat widget (phase 6) — `ChatProvider`/`ChatWidget` are not scaffolded yet; `ProtectedLayout`'s equivalent (`AppShell`) does not render a chat FAB in this phase.
- No real font files (tracked gap, see §3).
- No emblem-only logo asset (tracked gap, see §3).
- No backend changes of any kind — this is a frontend-only rebuild against the existing, unmodified API.

## 10. Open items requiring follow-up outside this build

- Confirm `VITE_AI_COPILOT_URL` default port (`.env` says `3000`, `ChatContext.jsx`'s in-code fallback says `3002`) before phase 6 — not relevant to phase 1.
- Confirm Google Sans Text's redistribution/licensing terms before self-hosting its WOFF2 files.
- Source or commission a clean, redraw-free emblem-only crop of the Mavera mark for the compact header.
