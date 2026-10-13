# Universal Codebase Architecture Rules

Version: 1.0  
Status: mandatory baseline with stack profiles  
Applies to: new applications, major modules, modernization work, and architecture reviews

## 1. Purpose

This document defines a reusable architecture standard for frontend applications, backend services, workers, bridges, integrations, and shared packages. The rules are framework-neutral first. Stack-specific sections explain how to apply them to React, Redux Toolkit, TanStack Query, React Router, NestJS, PostgreSQL, and external-system automation.

Treat this file as a living engineering contract. Framework versions may change; the ownership, boundary, security, test, and operability requirements do not change without an Architecture Decision Record (ADR).

The words **MUST**, **SHOULD**, and **MAY** have their normal standards meanings:

- **MUST**: required unless an approved ADR records an exception.
- **SHOULD**: expected default; deviations need a reason in the pull request.
- **MAY**: optional and selected according to product needs.

## 2. Universal principles

1. A module owns one coherent business capability.
2. Dependencies point inward: presentation → application → domain. Infrastructure implements interfaces owned by application or domain code.
3. A business fact has one authoritative owner. Do not mirror server resources into a second client store.
4. Transport DTOs, domain models, persistence entities, and external-system payloads are different types and are mapped at boundaries.
5. Authentication proves identity. Authorization proves permission. Tenant context narrows scope. None substitutes for another.
6. UI visibility is not a security boundary. Every protected server operation enforces authorization independently.
7. Async work is durable, idempotent, observable, and recoverable.
8. Configuration is validated at startup. Secrets are never committed, logged, placed in browser bundles, or returned through general-purpose APIs.
9. Public contracts are versioned and tested.
10. A feature is incomplete until its tests, telemetry, documentation, permissions, migrations, and failure behavior are complete.

## 3. Canonical workspace

Use this shape when a repository contains multiple deployable applications:

```text
apps/
  web/                  # Browser or desktop presentation application
  api/                  # Primary business API
  bridge/               # External-system adapter/automation worker
  worker/               # Optional general background processor
packages/
  contracts/            # Generated HTTP clients and versioned event schemas
  ui/                   # Product-neutral UI primitives and design tokens
  config/               # Shared lint, TypeScript, test, and build configuration
  observability/        # Logging, tracing, metrics, correlation helpers
  testing/              # Test factories, fixtures, contract harnesses
docs/
  architecture/         # C4 diagrams, ADRs, integration and data maps
tools/                  # Repository automation and validation scripts
```

For a single deployable application, keep the same boundaries inside `src/`; do not create packages that have no independent consumer.

### Workspace rules

- Every deployable app MUST have its own startup entrypoint, configuration schema, health/readiness behavior, tests, and build target.
- Root quality commands MUST cover every deployable app, including bridges and workers.
- Shared packages MUST have an explicit public entrypoint. Importing another package's internal path is forbidden.
- A shared package MUST be product-neutral or genuinely used by multiple owners. Do not use `shared` as a dumping ground.
- Dependency cycles between apps or features are forbidden.
- Generated artifacts, logs, caches, test results, build outputs, and secrets MUST be excluded from source control and architecture metrics.

## 4. Architecture layers

Each business feature uses these conceptual layers. Folder names may change by language, but responsibilities may not.

| Layer | Owns | Must not own |
|---|---|---|
| Presentation | Routes, controllers, pages, UI, request parsing | Database queries, external SDK details |
| Application | Use cases, orchestration, transactions, policies | HTTP framework objects, UI elements |
| Domain | Business rules, value objects, domain events | Framework decorators, database clients |
| Infrastructure | Repositories, HTTP clients, queues, storage, vendor SDKs | Product policy decisions |
| Contracts | Public request/response/event shapes | Persistence entities, secrets |

Cross-feature communication MUST use a documented public interface, application service, or event. Direct access to another feature's repository, entity internals, component internals, or private files is forbidden.

## 5. Dependency and ownership rules

- Every source file MUST have a clear feature owner or platform owner.
- Feature code MAY depend on shared/platform code; shared/platform code MUST NOT depend on feature code.
- Presentation code calls application interfaces, not persistence or vendor SDKs.
- Domain code MUST be deterministic and testable without network, filesystem, clock, or database access. Inject those capabilities.
- Cross-feature imports MUST be visible in architecture tests or dependency rules.
- Circular imports, service locators, global mutable state, and hidden singleton state are forbidden.
- Orphan files, unused routes, unused reducers, obsolete layouts, commented imports, and duplicate implementations MUST be removed or explicitly marked as migration artifacts with an owner and removal date.

## 6. State ownership

Classify state before selecting a tool:

| State type | Owner | Typical implementation |
|---|---|---|
| Server resource | Server/API | Query cache |
| Authenticated session/context | Auth boundary | Secure cookie plus minimal client session state |
| URL/navigation state | Router | Path, search params, route state |
| Form draft | Form component/feature | Form library or local reducer |
| Local UI state | Component/layout | Component state or scoped context |
| Durable user preference | Server when cross-device; browser otherwise | Preferences API or namespaced storage |
| Background job state | Worker/bridge database | Durable job model and events |

The same state MUST NOT be authoritative in Redux, a query cache, context, local storage, and component state simultaneously.

## 7. HTTP and event contracts

- OpenAPI MUST be the source of truth for HTTP endpoints when the stack supports it.
- Frontend/client types SHOULD be generated from the published contract.
- Public request and response schemas MUST be runtime validated at untrusted boundaries.
- Successful responses MUST follow one documented convention. Errors SHOULD use RFC 9457 Problem Details or an equally explicit versioned error contract.
- Errors MUST include a stable machine code, safe user message, HTTP status, and correlation ID. Validation errors include field-level details.
- Do not return ORM entities directly from public APIs.
- Uploads use an explicit multipart or pre-signed-upload contract; storage-provider details stay in infrastructure adapters.
- Events MUST have a stable name, schema version, event ID, occurred-at timestamp, producer, correlation/causation IDs, tenant scope, and idempotency key.
- Contract-breaking changes require versioning and a migration window.

## 8. Authentication, authorization, and tenancy

- Prefer short-lived server-managed sessions or secure, `HttpOnly`, `Secure`, appropriately `SameSite` cookies for browser authentication.
- Browser-readable encryption keys do not make local storage a secure token vault.
- Passwords, refresh tokens, private keys, decrypted credentials, and vendor secrets MUST never be returned to a general frontend route.
- Route guards improve UX; backend guards enforce security.
- Every protected use case MUST verify identity, active tenant, membership in that tenant, active role, permission, and resource ownership where applicable.
- Tenant or branch IDs supplied by headers, paths, queries, or bodies select context but never prove access. The server verifies them against authenticated membership.
- Repository queries for tenant data MUST include tenant scope by construction. Prefer tenant-scoped repository interfaces over remembering filters in each service.
- SUPER_ADMIN or equivalent bypasses MUST be explicit, documented, audited, and tested. Never add an accidental client-only bypass.
- Mutating and sensitive operations MUST produce audit events containing actor, effective role, tenant, resource, action, outcome, correlation ID, IP/device context where lawful, and safe metadata.
- Service-to-service calls MUST use workload identity, mTLS, signed short-lived tokens, or cloud-native request signing. Private networking alone is insufficient authentication.

## 9. Configuration and secrets

- Define a typed configuration schema per deployable app and fail startup on missing or invalid required values.
- Do not provide usable default secrets. Local defaults are allowed only for non-sensitive addresses and must be clearly development-only.
- Browser variables are public. Prefix conventions such as `VITE_` do not provide confidentiality.
- Secrets MUST come from an approved secret manager or deployment secret store and use least-privilege identities.
- Provide a safe `.env.example` containing names and non-secret examples for every app.
- Record configuration ownership, environment applicability, rotation expectations, and consumers.
- Never log environment dumps, authorization headers, cookies, credentials, OTP values, private payloads, or decrypted secrets.

## 10. Data and migrations

- Each table/entity has one owning module or service.
- Schema changes MUST use reviewed migrations in every shared environment. Automatic synchronization is local-development-only and SHOULD be disabled even locally once migrations are mature.
- Multi-table business operations use transactions with explicit boundaries.
- Unique constraints and indexes enforce invariants that must survive concurrency.
- Deletion policy—hard delete, soft delete, archive, or retention—must be decided per data class. Soft deletion requires filtered reads, unique-key policy, restore behavior, and purge policy.
- Migrations MUST be forward-safe, restartable where possible, and tested from the previous production schema.
- Sensitive fields use encryption or hashing appropriate to their access pattern; access is audited.

## 11. Async jobs, workers, and bridges

A bridge is an anti-corruption layer between the product domain and an external system.

- Frontends MUST call the primary API, never the bridge directly.
- The API validates the request, persists the business command, and creates an outbox/job record atomically.
- A durable broker or durable job store delivers work to the bridge. Fire-and-forget HTTP is not sufficient for accepted business work.
- The bridge converts canonical contracts into vendor-specific commands and maps results back into canonical events.
- External portal selectors, browser automation, vendor DTOs, and credentials remain inside connector infrastructure.
- Job acceptance and result processing MUST be idempotent.
- Model job, batch, and item status explicitly. Terminal outcomes are immutable unless a documented retry creates a new attempt.
- Retry transient failures with bounded exponential backoff and jitter. Permanent failures go to a dead-letter/review path.
- A recovery sweep MUST use leases or distributed locks so multiple replicas cannot re-run the same work concurrently.
- Record processing attempts separately from callback-delivery attempts. Do not repeat an external side effect merely because result delivery failed.
- Credential access is internal, least-privilege, purpose-limited, and never exposed through a public read endpoint.
- Every job propagates correlation ID, tenant scope, external reference, attempt number, and idempotency key.

## 12. React application profile

### Folder structure

```text
src/
  app/
    providers/
    router/
    store/
    config/
  features/
    <domain>/
      api/
      model/
      pages/
      components/
      hooks/
      schemas/
      routes.tsx
      index.ts
  shared/
    ui/
    lib/
    hooks/
    schemas/
    types/
  main.tsx
```

- `app` composes the application and MUST NOT become a business-feature folder.
- A feature exposes a small public `index.ts`; external code must not import its internals.
- Shared UI primitives contain no business permissions, API calls, tenant assumptions, or feature text.
- Pages orchestrate view components and feature hooks; presentational components do not fetch directly.

### Redux Toolkit

- Redux Toolkit is the approved Redux API. Use `configureStore`, `createSlice`, typed `useAppDispatch`, and typed `useAppSelector`.
- Redux stores only durable client/session context that multiple distant features genuinely need.
- Do not copy API collections, loading flags, mutation results, or query errors into ordinary slices when the selected server-state engine owns them.
- Persist only an explicit allowlist. Add persistence versioning and migrations.
- Logout resets every session slice, query cache, sensitive storage namespace, in-memory credential session, and browser subscription tied to the user.
- Reducers remain pure and serializable. Do not disable serializability checks globally without a documented exception.
- Unregistered slices and unused selectors/actions are build-time failures through lint or architecture tests.

### Server-state engine: choose exactly one

Use either TanStack Query or RTK Query for an application boundary, not both. Record the decision in an ADR. A second cache engine is allowed only during a time-boxed migration with named owners, measurable exit criteria, and an end date.

#### TanStack Query profile

- TanStack Query owns server resources, caching, loading, error, retry, mutation, and invalidation behavior.
- Do not introduce RTK Query into the same application unless an approved migration plan removes one of the two caches.
- Define query-key factories per resource. Tenant-sensitive keys include all scope dimensions:

```ts
const requirementKeys = {
  all: (scope: ActiveScope) => ["requirements", scope.institutionId, scope.branchId, scope.roleId] as const,
  list: (scope: ActiveScope, filters: RequirementFilters) => [...requirementKeys.all(scope), "list", filters] as const,
  detail: (scope: ActiveScope, id: string) => [...requirementKeys.all(scope), "detail", id] as const,
};
```

- Query functions receive parameters from the key or explicit closure; hidden global scope must not make two keys fetch different data.
- Mutations invalidate or update every affected key using the key factory.
- Context switching cancels in-flight queries and clears or partitions all tenant-sensitive cache entries before new UI renders.
- Centralize default retry policy. Do not retry authentication, authorization, validation, or other permanent failures.
- Components handle loading, error, empty, stale, and success states deliberately.

#### RTK Query profile

- Define one `createApi` service per coherent API boundary, normally one for the primary Backend and separate services only when base URLs, authentication, or lifecycle policies genuinely differ.
- Configure `fetchBaseQuery` or a custom base query once for base URL, access token, tenant headers, correlation IDs, normalized errors, and refresh handling.
- Use stable tag types and explicit `providesTags`/`invalidatesTags`; prefer entity/list tags over broad cache invalidation.
- Include every tenant and role scope dimension in endpoint arguments so cache keys cannot collide across contexts.
- Use `injectEndpoints` for feature ownership while keeping the base API and middleware registration centralized.
- Logout and context switching must cancel/reset the API state with `api.util.resetApiState()` or an equivalent partition strategy before protected UI for the next context renders.
- Components use generated hooks and domain-facing selectors; they must not call the base query, `fetch`, or Axios directly.
- Do not duplicate RTK Query results in ordinary Redux slices. Store only client workflow state that is not already represented by route state, form state, or the server cache.

### Router and navigation

Use one typed route manifest as the source for route registration, navigation, breadcrumbs, layouts, and authorization metadata:

```ts
type RouteAccess =
  | { kind: "public" }
  | { kind: "guest-only" }
  | { kind: "authenticated" }
  | { kind: "context-required"; roles?: RoleCode[]; anyPermissions?: PermissionCode[] };

interface AppRouteDefinition {
  id: string;
  path: string;
  access: RouteAccess;
  layout: "public" | "app" | "admin" | "full-screen";
  lazyPage: () => Promise<unknown>;
  navigation?: { label: string; icon: string; section: string; order: number };
}
```

- Public, guest-only, authenticated, forced-password-change, context-selection, role, and permission behavior MUST have explicit precedence.
- Private-route redirects preserve the intended destination when safe.
- Menu entries MUST be derived from or validated against registered routes.
- A permission code used by navigation or a component MUST exist in the route manifest and backend contract.
- Wildcard and access-denied routes must not create redirect loops.
- Lazy routes require route-level loading and error boundaries.

### HTTP client

- One shared transport client handles base URL, credentials, auth attachment, correlation headers, timeout, cancellation, and normalized errors.
- Feature API modules own endpoint calls and DTO mapping.
- Components, pages, layouts, and general utilities MUST NOT call `fetch` or Axios directly.
- Pre-signed third-party uploads MAY use a bare transport without product authorization headers.
- A 401 ends the invalid session. A 403 does not automatically destroy a valid session; it displays access denial unless the server contract explicitly says otherwise.

## 13. NestJS API profile

```text
src/
  modules/<domain>/
    presentation/       # controllers and HTTP DTOs
    application/        # use cases and ports
    domain/             # rules, models, events
    infrastructure/     # TypeORM repositories and external adapters
    <domain>.module.ts
  platform/
    auth/
    tenancy/
    database/
    observability/
    configuration/
  main.ts
```

- Controllers parse transport input and call one application use case. They do not contain database or vendor logic.
- Global validation uses whitelist and transform rules; unknown fields are rejected or stripped according to the published contract.
- Auth, tenant, role, and permission guards are composed consistently. Public endpoints require an explicit decorator and security review.
- Mutating endpoints declare audit metadata.
- Application services define transaction boundaries and use repository interfaces.
- TypeORM entities stay in infrastructure. Domain and response models do not inherit persistence decorators.
- Module exports are the module's public API. Avoid global modules except small platform capabilities with clear ownership.
- Swagger/OpenAPI generation and contract-drift tests are mandatory.
- Health, readiness, graceful shutdown, structured logging, rate limits, secure headers, request-size limits, and error filters are configured consistently in every Nest app, including bridges.

## 14. Observability and reliability

- Propagate a W3C trace context or equivalent across browser, API, queue, bridge, database, and outbound HTTP.
- Structured logs include timestamp, level, service, environment, correlation/trace ID, operation, outcome, duration, and safe scope identifiers.
- Metrics cover request rate/error/duration, queue depth/age, job success/failure/retry, callback delivery, dependency latency, and database saturation.
- Define service-level indicators and alerts for user-visible journeys, not merely process uptime.
- Logs, metrics, and traces MUST correlate. Sensitive data must be redacted before emission.
- Health means process responsiveness; readiness verifies required dependencies without leaking details.

## 15. Testing strategy

| Test | Required coverage |
|---|---|
| Unit | Domain rules, selectors, reducers, key factories, mappers |
| Component | Loading/error/empty/success, accessibility, permission presentation |
| Integration | Controller/use case/repository, transaction and tenant isolation |
| Contract | OpenAPI client/server compatibility and event schema compatibility |
| End-to-end | Critical user journeys across real boundaries |
| Architecture | Forbidden imports, cycles, route/menu parity, permission parity |
| Security | Tenant escape, broken object authorization, auth/session, secret exposure |
| Migration | Previous schema to current schema with representative data |
| Recovery | Retry, duplicate delivery, process restart, stale lease, callback failure |

Tests MUST prove both allowed and denied behavior. Multi-tenant tests require at least two tenants and attempt cross-tenant access.

## 16. CI/CD quality gates

Every pull request MUST run:

1. Formatting check without rewrites.
2. Lint.
3. Type-check.
4. Unit and component tests.
5. Integration and contract tests.
6. Architecture/dependency validation.
7. Secret and dependency vulnerability scanning.
8. Production build for every deployable app.
9. Migration validation when schemas change.
10. Generated-contract drift check.

Main-branch or release pipelines add end-to-end, recovery, performance, deployment, and smoke tests. A bridge omitted from root CI is a release blocker.

## 17. Documentation and decisions

Maintain:

- System context and container diagrams.
- Module ownership and dependency map.
- Route/API/entity traceability matrix.
- Permission matrix.
- Integration and secret-access register.
- Data ownership and retention map.
- Runbooks for critical alerts, queues, migrations, and bridge recovery.
- ADRs for meaningful choices and exceptions.

Documentation MUST be checked against executable configuration and code. Version claims, URLs, ports, Swagger paths, and scripts must not drift silently.

## 18. Definition of done

A feature is done only when:

- Ownership and boundaries are clear.
- UI route and navigation metadata agree.
- Backend permission and tenant checks exist and are tested.
- API/event contracts and generated clients are updated.
- Query keys contain required scope and mutations invalidate correctly.
- Database migrations and rollback/recovery notes exist when needed.
- Audit and telemetry are present.
- Loading, error, empty, denied, retry, and offline/dependency-failure behavior are handled.
- Tests pass at the appropriate levels.
- Documentation and diagrams are current.
- No secret, demo-only dependency, stale code, or unexplained TODO remains.

## 19. Reusable audit templates

### File inventory

| Path | App/layer | Feature owner | Kind | Runtime entry? | Public API? | Status | Evidence |
|---|---|---|---|---|---|---|---|

Every file must be mapped, explicitly excluded with a reason, or recorded as unresolved.

### Dependency matrix

| Source | Target | Relation | Allowed? | Confidence | Source location | Action |
|---|---|---|---|---|---|---|

Confidence is `EXTRACTED`, `INFERRED`, or `AMBIGUOUS`. Never present an inference as an extracted fact.

### Route-to-data trace

| URL | Access | Layout | Page | Hook | Query/mutation | HTTP contract | Controller | Use case | Entity/event | Integration |
|---|---|---|---|---|---|---|---|---|---|---|

### State and query ownership

| State/resource | Authoritative owner | Client tool | Persistence | Scope fields | Key/factory | Mutations | Invalidations | Reset trigger |
|---|---|---|---|---|---|---|---|---|

### Permission matrix

| Capability | Menu | Route | Component action | Backend permission | Tenant rule | Denied test | Status |
|---|---|---|---|---|---|---|---|

### Integration register

| Integration | Owner | Direction | Contract | Auth | Secret location | Timeout/retry | Idempotency | Telemetry | Failure owner |
|---|---|---|---|---|---|---|---|---|---|

### Risk and evidence matrix

| ID | Finding | Severity | Evidence | Impact | Recommendation | Owner | Verification |
|---|---|---|---|---|---|---|---|

### ADR template

```text
# ADR-NNN: Decision title
Status: proposed | accepted | superseded
Date:
Owners:

## Context
## Decision
## Alternatives considered
## Consequences
## Security and data impact
## Rollout and rollback
## Verification
```

### Completeness checklist

- [ ] All files inventoried or explicitly excluded.
- [ ] All entrypoints and deployables identified.
- [ ] All routes resolved to pages and access rules.
- [ ] All outbound and inbound integrations registered.
- [ ] All API calls mapped or marked unresolved.
- [ ] All controllers classified by consumer.
- [ ] All entities and migrations assigned an owner.
- [ ] All Redux/query/storage consumers classified.
- [ ] All permissions compared across UI and server.
- [ ] All schedulers, queues, callbacks, and recovery paths mapped.
- [ ] All configuration names classified without exposing values.
- [ ] All findings have evidence and confidence.
- [ ] Dependency, route, data, auth, and async diagrams agree with code.
- [ ] Source integrity verified after the audit.

## 20. Maintained reference baseline

Re-check these primary sources when adopting a new major version; this rule was reviewed against them on 2026-08-21:

- [Redux Toolkit: RTK Query overview](https://redux-toolkit.js.org/rtk-query/overview)
- [TanStack Query: query keys](https://tanstack.com/query/latest/docs/framework/react/guides/query-keys)
- [React Router: routing](https://reactrouter.com/start/framework/routing)
- [NestJS: modules](https://docs.nestjs.com/modules)
- [NestJS: guards](https://docs.nestjs.com/guards)
- [NestJS: global authentication guard and explicit public routes](https://docs.nestjs.com/security/authentication)
- [OWASP API1:2023 Broken Object Level Authorization](https://owasp.org/API-Security/editions/2023/en/0xa1-broken-object-level-authorization/)
- [OWASP API5:2023 Broken Function Level Authorization](https://owasp.org/API-Security/editions/2023/en/0xa5-broken-function-level-authorization/)
- [OpenTelemetry signals](https://opentelemetry.io/docs/concepts/signals/)
- [OpenTelemetry context propagation](https://opentelemetry.io/docs/concepts/context-propagation/)

## 21. Updating this standard

Review this file at least quarterly and whenever the platform changes its router, state library, API framework, database, queue, authentication model, or deployment architecture. Update stack-specific recommendations against current official documentation, record material changes in an ADR, and keep the universal principles stable.
