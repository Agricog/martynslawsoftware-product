# Architecture

System design and decisions log for `martynslawsoftware-product`.

> Read this before writing code in a new area. Update this when making a non-trivial decision.

---

## Principles

These are the non-negotiables. Every PR should be checkable against them.

1. **Multi-tenancy is structural.** Every table that holds tenant data has `organisation_id NOT NULL`. Every query filters by it. There is no "global" data view.
2. **Audit log is mandatory.** Every mutation writes to `audit_log` before returning. The log captures: actor (user_id), tenant (organisation_id), action, target (entity_type + entity_id), before/after diff (where applicable), timestamp, IP, user agent.
3. **Soft delete by default.** No table uses hard `DELETE` for tenant data. All tables have `deleted_at TIMESTAMP NULL`. Hard deletes only happen via the data-export-and-delete GDPR flow, which is explicit and irreversible.
4. **Idempotency on all writes.** Mutating endpoints accept `Idempotency-Key`. Stripe webhooks, Clerk webhooks, and any externally-triggered side effect must be idempotent.
5. **Validation at the edge, type safety throughout.** Zod schemas at API boundaries (request body, response, env vars). Drizzle types flow from schema. Shared types live in `packages/shared`.
6. **Encryption in transit and at rest.** TLS 1.2+ end-to-end (Cloudflare → Worker → Hyperdrive → Neon, all encrypted). Neon encrypts at rest. R2 encrypts at rest. Sensitive columns (e.g. emergency contacts) get application-level encryption.
7. **Least privilege.** API tokens are scoped to a single resource where the provider supports it. Service accounts are not shared between staging and production.
8. **Observability is a feature.** Sentry for errors. Workers Logs + Logpush to R2 for request logs. Audit log for business events. Alarms on rate-limit hits, 5xx spikes, payment failures.
9. **Privacy by design.** No PII in URL paths or query strings. PII redacted in logs. Sentry PII scrubbing rules on. Logs retained 30 days, audit log retained 7 years (compliance evidence requirement).
10. **Backups and DR are tested, not just configured.** Quarterly restore drill from Neon PITR + R2 versioning. Drill outcome logged.

---

## System overview

```
                     ┌──────────────────────┐
   end users ───────▶│  Cloudflare Pages    │  app.martynslawsoftware.co.uk
                     │  (React SPA)         │
                     └──────────┬───────────┘
                                │ tRPC over HTTPS
                                ▼
                     ┌──────────────────────┐    ┌────────────┐
                     │  Hono on Workers     │───▶│  Sentry    │
                     │  (API)               │    └────────────┘
                     └──────────┬───────────┘
                                │
        ┌───────────┬───────────┼───────────┬──────────┬──────────┐
        ▼           ▼           ▼           ▼          ▼          ▼
   ┌──────────┐ ┌────────┐ ┌──────────┐ ┌────────┐ ┌──────┐ ┌─────────┐
   │Hyperdrive│ │  R2    │ │  Clerk   │ │ Stripe │ │Resend│ │ Queues  │
   │   ↓      │ │(files) │ │ (auth)   │ │(billing│ │(email│ │(jobs/   │
   │  Neon    │ │        │ │          │ │ +tax)  │ │ +DKIM│ │ cron)   │
   │ Postgres │ │        │ │          │ │        │ │ /SPF)│ │         │
   │  (EU)    │ │        │ │          │ │        │ │      │ │         │
   └──────────┘ └────────┘ └──────────┘ └────────┘ └──────┘ └─────────┘
```

All services chosen to be EU-region or globally-replicated-with-EU-residency, except Stripe (which holds card data — not subject to our DPA) and Sentry (configured for EU region).

---

## Request lifecycle (write path)

1. User clicks "Save" in the SPA.
2. SPA calls tRPC mutation. `Idempotency-Key` header set to a UUID.
3. Hono receives request. Clerk middleware validates JWT, attaches `auth.userId`, `auth.organisationId`.
4. tRPC procedure validates input against Zod schema.
5. Procedure opens a Drizzle transaction:
   - Insert/update business entity, scoped by `organisation_id`.
   - Insert `audit_log` row with full context.
6. Transaction commits.
7. (If applicable) Background job enqueued to Cloudflare Queue (e.g. send confirmation email, regenerate evidence pack).
8. Response returned with new entity state.
9. Client invalidates relevant TanStack Query cache keys.

If any step fails, the transaction rolls back. The user sees a useful error. Sentry captures the exception with PII scrubbed.

---

## Tenancy model

- **Organisation** = a customer (a venue operator, e.g. "The Fox & Hounds Ltd").
- **Venue** = a single premises operated by an organisation (Standard tier = 1 venue / org; Chain tier = up to 10).
- **User** = a real human with credentials.
- **Membership** = a user's role within an organisation (owner / admin / staff / read-only).

Users can belong to multiple organisations (e.g. a consultant). Membership row carries the role. Every API call resolves: userId → membership for current organisationId → role → permissions.

---

## Repository layout (target)

```
apps/
  web/        Vite + React 18 SPA (Cloudflare Pages target)
  api/        Hono on Cloudflare Workers (Wrangler target)
packages/
  db/         Drizzle schema + migrations + seed
  shared/     Zod schemas, branded types, constants, tRPC router shape
  email/      React Email templates + Resend client wrapper
  pdf/        @react-pdf/renderer document templates
  tsconfig/   Shared TypeScript configurations (DONE — Batch 2)
```

Internal package naming: `@martynslaw/<dirname>`.

---

## Decisions log (ADR-lite)

Append entries chronologically. Each entry: date, title, context, decision, consequences.

### ADR-001 · 26 Apr 2026 · Backend on Cloudflare Workers (not Fly.io)

**Context.** Backend hosting choice. Trade-off: Workers (zero idle cost, edge-native, same ecosystem as marketing + frontend) vs. Fly.io (always-on Node, simpler for long-running tasks like Puppeteer PDF generation).

**Decision.** Workers. PDF generation moved to `@react-pdf/renderer` (pure JS, runs in Workers) to remove the headless-Chrome motivation for Fly.

**Consequences.**

- Single Cloudflare account holds all infra (Pages, Workers, R2, Queues, Hyperdrive). One vendor relationship.
- DB connections from edge handled by Hyperdrive — adds dependency.
- Workers runtime constraints (no native Node APIs, 30s wall time on paid plan, 128MB memory) shape what can run inline vs. in Queues.
- `process.env` not available at runtime — env vars come from Worker bindings.

### ADR-002 · 26 Apr 2026 · Auth via Clerk (not Supabase Auth, not own)

**Context.** Auth choice for a compliance product where auth bugs = customer trust loss.

**Decision.** Clerk. SOC 2 Type 2, MFA built-in, audit logs included, GDPR endpoints available, enterprise SSO when needed (phase 2 sales).

**Consequences.**

- Recurring cost (~£0–25/mo at MVP scale, more at growth scale). Logged as accepted operational cost.
- User identity lives outside our Postgres — we sync via Clerk webhooks into `users` table for foreign key integrity.
- Lock-in non-trivial (migrating auth providers is rare but expensive). Mitigation: keep our `users` table populated with email + name so we'd retain the user record on migration.

### ADR-003 · 26 Apr 2026 · Database on Neon (not Supabase, not Cloudflare D1)

**Context.** Database choice. D1 (SQLite, native to Workers) considered but rejected.

**Decision.** Neon Postgres in EU region.

**Consequences.**

- Real Postgres = mature ecosystem, real foreign keys, proper indexing, branching for dev environments.
- D1 rejected: SQLite limits (write contention), eventual consistency in replication, fewer ops engineers know it.
- Supabase rejected: bundled features (auth, storage) we don't need; we already have Clerk and R2.
- Hyperdrive required to make Postgres usable from Workers (connection pooling).

### ADR-004 · 26 Apr 2026 · Maximum-strict TypeScript config

**Context.** Per "no shortcuts" mandate.

**Decision.** Enable `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `noPropertyAccessFromIndexSignature` from day 1. These are typically deferred because they catch real bugs that need explicit handling.

**Consequences.**

- More verbose code in some places (explicit array bounds checks, explicit `?: T | undefined`).
- Catches bugs that would otherwise hit production.
- Cannot be retrofitted easily once a codebase has thousands of files — must be on from day 1.

### ADR-005 · 26 Apr 2026 · Soft delete + audit log on every table

**Context.** Compliance product = customers' regulatory evidence depends on our records being intact. A "DELETE FROM drills WHERE id = …" bug is unrecoverable without point-in-time backup.

**Decision.** No tenant table uses hard delete. `deleted_at` column on every table. Audit log captures every mutation.

**Consequences.**

- Every query needs `WHERE deleted_at IS NULL` (handled via Drizzle base query helper).
- Disk usage grows unbounded — periodic anonymise-and-purge job for soft-deleted rows older than retention policy.
- GDPR right-to-erasure handled via explicit data export + hard delete flow, separate from normal soft-delete.
