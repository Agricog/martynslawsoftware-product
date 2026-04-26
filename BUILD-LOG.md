# Build Log — martynslawsoftware-product

A running record of build failures encountered during development, their root causes, and the fixes applied. Referenced at the start of every new chat to prevent repeating mistakes.

> This is the **product** repository's build log. The **marketing site** has its own at the `martynslawsoftware.co.uk` repo. Separate concerns, separate logs.

---

## How to use this file

At the start of any new chat with an LLM building this project, paste this file (or its location) so the model has context for previous failures and fixes. After each chat that includes builds, append new lessons.

---

## Standing principles

Derived from the marketing site's build log plus product-specific additions.

1. **Read before write.** Before reusing or editing any existing file (component, schema, route, type, migration), open it and confirm names, shapes, and contracts. Never guess from memory.
2. **Preserve conventions on overwrite.** When overwriting an existing file, match casing, export shape, prop names, file-internal comment style exactly. Never silently change a convention.
3. **Audit siblings on build failure.** If one shared module fails, check every other shared module on the same surface before re-running.
4. **Small batches.** Maximum 6 files per batch. Deploy, go green, move on. Failed batches isolate to small surfaces.
5. **Test before claiming green.** Type-check, lint, build, and (where relevant) unit-test must all pass before user confirms green.
6. **Keep batch surface area small.** Prefer all-NEW batches. Mix overwrites and new files only when necessary.
7. **No silent stack drift.** Stack choices are locked at chat 1 (see snapshot below). Adding a new dependency is a deliberate decision, logged here.
8. **Premium product, no shortcuts.** Architectural decisions optimise for security, correctness, observability — not speed. If a "quick fix" violates this, log it as tech debt and do the proper fix.
9. **Multi-tenant from day 1.** Every query, every mutation, every audit log entry must include `organisation_id`. Never query without tenancy filter — even for "admin" surfaces.
10. **Audit-loggable from day 1.** Every state-changing API call writes to `audit_log` before returning. No exceptions for "internal" calls.

---

## Stack snapshot (locked Chat 1)

| Layer             | Choice                                            |
| ----------------- | ------------------------------------------------- |
| Frontend          | React 18 + Vite + TypeScript + Tailwind v4        |
| Frontend hosting  | Cloudflare Pages → `app.martynslawsoftware.co.uk` |
| Routing           | TanStack Router                                   |
| Data layer        | TanStack Query + tRPC                             |
| Backend           | Hono on Cloudflare Workers                        |
| DB connection     | Cloudflare Hyperdrive                             |
| Database          | Neon Postgres (EU region)                         |
| ORM               | Drizzle                                           |
| Validation        | Zod                                               |
| Auth              | Clerk                                             |
| Storage           | Cloudflare R2                                     |
| Email             | Resend                                            |
| Payments          | Stripe                                            |
| PDF               | `@react-pdf/renderer`                             |
| Background jobs   | Cloudflare Queues + Cron Triggers                 |
| Errors            | Sentry                                            |
| Testing           | Vitest + Playwright + MSW                         |
| CI                | GitHub Actions                                    |
| Security scanning | Dependabot + Snyk + CodeQL                        |

Adding a dependency outside this list = a logged decision. Either accept the new line in the table, or use what's already there.

---

## File-naming conventions

- TypeScript files: `kebab-case.ts` for utilities, `PascalCase.tsx` for React components.
- Route files (TanStack Router): per the framework's file-based convention, `~snake-case.tsx`.
- Schema/migration files: timestamp-prefixed (`0001_initial.sql`, `0002_add_audit_log.sql`).
- Test files: colocated with source, `*.test.ts` / `*.test.tsx`.
- Worker handler files: `kebab-case.ts`.

---

## Architectural patterns codified

(none yet — populated as patterns emerge)

---

## Tech debt register

(none yet — populated as shortcuts are knowingly accepted)

---

## Chat log

### Chat 1 — 26 Apr 2026 — Project kickoff + workspace bootstrap

**Context:** Marketing site launched 25 Apr. User instruction: "premium product, no corners cut." Single-instruction mandate — every architectural decision optimises for that.

**Decisions locked:**

- Stack snapshot above.
- Repo name: `martynslawsoftware-product`.
- Subdomain: `app.martynslawsoftware.co.uk` (set up later, after Cloudflare Pages project exists).
- MVP scope: Standard tier only (£29/mo). Chain and Enhanced phase 2.
- Build sequence: 14 batches planned, 12–16 weeks realistic.

**Batch 1: workspace bootstrap.**

- 6 files, all NEW: `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `.gitignore`, `.nvmrc`, `README.md`.
- Node 22 LTS pinned, pnpm 9.15 pinned via `packageManager` field.
- Turborepo 2.x task pipeline configured with build/dev/lint/test/typecheck/clean.
- No build failures.

**Batch 2: governance + shared TS config.**

- 6 files, all NEW: `BUILD-LOG.md`, `ARCHITECTURE.md`, `SECURITY.md`, `packages/tsconfig/package.json`, `packages/tsconfig/base.json`, `packages/tsconfig/react.json`.
- TS config is maximum strict: `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `noPropertyAccessFromIndexSignature` all on. Codifies "no shortcuts" at the type level.
- No build failures expected.

**Lessons / patterns codified:**

- BUILD-LOG, ARCHITECTURE, SECURITY are the three governance docs at repo root.
- Internal package naming convention: `@martynslaw/<name>` scope.
- TS config package exposes named entry points (`base.json`, `react.json`, `node.json`, `workers.json`) — packages extend the relevant one, never the bare `base.json` if a more specific config fits.

---

## Next chat starting context

When opening a new chat to continue building:

1. Paste this file in full.
2. Paste `ARCHITECTURE.md` (decisions log).
3. State which batch number is next.
4. State current repo state (last green commit hash if known).

The LLM should read all three governance docs before writing any code.
