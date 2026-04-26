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
4. **Small batches.** Six files at a time, max. Multi-file overwrites must be justified per file.
5. **Test against repo state, not against assumptions.** Before declaring a batch ready, copy it into a mirror of the actual current repo and run the full CI pipeline locally — `pnpm install --frozen-lockfile`, `pnpm format:check`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm audit`. Skipping any of these is how Batch 3 shipped a Prettier-failing `ci.yml`.
6. **Lockfile is a deliverable.** Whenever a `package.json` changes (new dep, version bump), the regenerated `pnpm-lock.yaml` ships in the same batch. Never let CI install resolve fresh — `--frozen-lockfile` is the only acceptable mode.
7. **Type safety is non-negotiable.** Max-strict TS flags (`exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `noPropertyAccessFromIndexSignature`) are on from file 1 and never relaxed. Retrofitting these later costs weeks.
8. **Validation at the edge.** Zod schemas at every API boundary — request bodies, response shapes, env vars, third-party webhook payloads. No `any`, no unchecked casts at trust boundaries.
9. **Audit log is mandatory.** Every mutation writes to `audit_log` before returning. Not optional, not deferred.
10. **Multi-tenancy is structural.** Every tenant table has `organisation_id NOT NULL`. Every query filters by it. There is no "global" data view.

---

## Conventions established (don't break)

- **Internal package scope:** `@martynslaw/<name>`. Examples: `@martynslaw/shared`, `@martynslaw/api`, `@martynslaw/tsconfig`.
- **Shared TS configs:** `packages/tsconfig` exposes named entry points (`base.json`, `react.json`, `node.json`, `workers.json`). Each consumer extends the most specific one that fits, never the bare `base.json` if a more specific config exists.
- **Worker name = Cloudflare project name = `wrangler.jsonc` `name` field.** All three must match exactly. Currently: `martynslaw-api`.
- **Live URLs:** API at `martynslaw-api.micks43.workers.dev` (custom domain `api.martynslawsoftware.co.uk` deferred until SPA also deployed). SPA target: `app.martynslawsoftware.co.uk`.
- **CI gates every push.** `pnpm install --frozen-lockfile` → format check → typecheck → lint → build → security audit. Red ❌ blocks merge; this is the source of truth for "green".

---

## Chat 1 — Batches 1, 2, 3 (26 April 2026)

### Incident 1 — Batch 3 CI failure: `ci.yml` failed its own format check

**Context:** Batch 3 shipped the CI workflow file (`.github/workflows/ci.yml`) plus Prettier config. CI ran on the resulting commit and failed at the `format:check` step.

**Error:** `ci.yml` used single quotes for YAML strings; `.prettierrc.json` had a YAML override forcing double quotes.

**Root cause:** Local pre-flight test was run against an older snapshot of the repo that didn't contain the new `.github/` files. The format check passed locally because there was nothing in `.github/` to check.

**Fix:** Rewrote `ci.yml` with double-quoted YAML strings. Re-ran full pipeline locally against a complete mirror. Green on next push.

**Prevention rule:**

> Before declaring a batch ready, the local test mirror must contain **every** file the batch ships, not a subset. Run the full CI pipeline (install · format · typecheck · lint · build · audit) against the complete mirror. If any new file lives under a directory the format check covers, that file gets checked locally first.

### Incident 2 — Communication breakdown during file uploads

**Context:** Mid-Batch 3, user (on mobile, no local dev environment, uploading via GitHub web UI) became blocked by overly compressed instructions referring to "drag all 13 files" without making clear which files were new vs overwrites.

**Root cause:** Assistant assumed familiarity with GitHub upload flow and zip handling that the user did not have. Instructions referenced "the zip from my batch 3 message" without a clear path to find it.

**Fix:** Switched to one-file-at-a-time delivery, downloadable file per message, exact path field text to type, exact commit message text. Communication unblocked.

**Prevention rule:**

> When the user signals confusion (especially with explicit frustration), immediately switch modes: one file per message, downloadable file (not pasted code in chat), exact instructions for filename/path/commit message, no jargon, no batch references. Do not attempt to "explain better" — just simplify the unit of work.

---

## Chat 2 — Batches 4, 5a, 5b (26 April 2026)

### Batch 4 — `packages/shared` — green first push

No incidents. Zod 4.3.6 verified current. Branded types, env validation, constants all built clean. `dist/*.js` + `dist/*.d.ts` produced as expected. Worth noting:

- **Zod v4 API differs from v3.** Always check current Zod major version before writing schemas — `z.string().email()` style still works, but some refinement APIs changed. Verified locally before shipping.

### Batch 5a — `apps/api` skeleton — green first push

No incidents. Hono 4.12 + Wrangler 4.85 + workers-types 4.2026 all current. Worker built to ~73 KiB / ~18 KiB gzipped. Health-check endpoint, request-ID middleware, security headers middleware (HSTS, nosniff, X-Frame-Options, COOP/CORP), CORS, error handler — all present from file 1.

### Batch 5b — First Cloudflare deployment — green first try (with caveats)

**Context:** Connected the GitHub repo to a new Cloudflare Workers project via the dashboard wizard. Monorepo deployment from a non-default project structure required four non-default settings.

**Settings that were not the wizard defaults:**

| Field                        | Wizard default                           | Required value                                                          | Why                                                                    |
| ---------------------------- | ---------------------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Project name                 | `martynslawsoftware-product` (repo name) | `martynslaw-api`                                                        | Must match `name` in `wrangler.jsonc`                                  |
| Build command                | `pnpm run build`                         | `pnpm install --frozen-lockfile && pnpm --filter @martynslaw/api build` | Monorepo: install at root, build only the API package                  |
| Deploy command               | `npx wrangler deploy`                    | `pnpm --filter @martynslaw/api exec wrangler deploy`                    | Wrangler must run from inside `apps/api/` where `wrangler.jsonc` lives |
| Non-production branch deploy | `npx wrangler versions upload`           | `pnpm --filter @martynslaw/api exec wrangler versions upload`           | Same reason as above                                                   |

**Settings that stayed default (don't change these):**

- **Path:** `/` — Cloudflare's "Path" field is the working directory it `cd`s into before running build/deploy. Must be repo root so `pnpm-lock.yaml` and root `package.json` are found. The `--filter` flag in build/deploy commands is what scopes work to the API package. Setting Path to `apps/api` would break dependency resolution.
- **API token:** the auto-created `Workers Builds - <date>` token. Don't generate a new one.
- **Variable name / Variable value:** leave blank. The only env var (`ENVIRONMENT`) is set in `wrangler.jsonc` under `vars`. Real secrets get added later via `wrangler secret put`, never via the dashboard UI (avoids accidental exposure in screenshots/logs).

**Verification approach:**

1. Hit `/health` in browser — got expected JSON: `{"status":"ok","environment":"development","requestId":"<uuid>","timestamp":"<iso>"}`.
2. DevTools Network tab → Response Headers — confirmed all security middleware was active end-to-end:
   - `Strict-Transport-Security: max-age=15552000; includeSubDomains` ✓
   - `X-Content-Type-Options: nosniff` ✓
   - `X-Frame-Options: SAMEORIGIN` ✓
   - `X-Xss-Protection: 0` (correct modern value — this header off is right when CSP handles XSS) ✓
   - `Cross-Origin-Opener-Policy: same-origin` ✓
   - `Cross-Origin-Resource-Policy: same-origin` ✓
   - `Referrer-Policy: no-referrer` ✓
   - `X-Request-Id` header matched `requestId` in JSON body ✓ (end-to-end correlation working)
3. `Cf-Ray` header showed `MAN` edge — UK latency ~5ms confirmed.

**Cloudflare UI quirk worth knowing:** the dashboard labels the initial post-setup deploys as **"Manually deployed"** even though the project is GitHub-connected. This is misleading but harmless. Auto-deploy on push will be verified in Batch 6 (when there's a real code change to push).

**Prevention rules:**

> Cloudflare Workers monorepo deployments: keep Path at `/`, use `pnpm --filter <pkg-name>` in build and deploy commands, and set the project name to match the Worker `name` in `wrangler.jsonc`. Do not change the API token unless replacing a compromised one — the auto-created Workers Builds token is correct.

> Production secrets are set via `wrangler secret put NAME`, never via the Cloudflare dashboard "Variable" UI. The dashboard is only for non-secret vars, and even then the preference is to put them in `wrangler.jsonc` under `vars` so they're version-controlled.

> Custom domain setup is deferred until both the API and SPA are live (Batch 6b). Setting up `api.` and `app.` subdomains in one session is cleaner than splitting them.

### Lesson — communication

The Chat 1 prevention rule about switching modes when user signals confusion held this chat. Cloudflare wizard had unfamiliar fields; one-screenshot-at-a-time review caught all four non-default settings before clicking Deploy. No wasted deploys.

---

## Where we are at end of Chat 2

| Batch | Description                                       | Status                                          |
| ----- | ------------------------------------------------- | ----------------------------------------------- |
| 1     | Workspace bootstrap                               | ✅ Green                                        |
| 2     | Governance docs + tsconfig package                | ✅ Green                                        |
| 3     | CI pipeline + tooling baseline                    | ✅ Green                                        |
| 4     | `packages/shared` (Zod, branded types, constants) | ✅ Green                                        |
| 5a    | `apps/api` skeleton (Hono on Workers)             | ✅ Green                                        |
| 5b    | First Cloudflare deployment                       | ✅ Live at `martynslaw-api.micks43.workers.dev` |

**Open / deferred:**

- Auto-deploy-on-push verification (will happen naturally on first Batch 6 push).
- Custom domain `api.martynslawsoftware.co.uk` (deferred to Batch 6b alongside `app.` subdomain).
- Branch protection on `main` (deferred — would block current single-file commit workflow; revisit when collaboration model changes or a CLI is introduced).
- Dependabot PR auto-merge rules (deferred — same reason).

**Last green commit:** `e9bbd4ed` (initial Cloudflare deployment of API).

---

## Next chat starting context

When opening a new chat to continue building:

1. Paste this file in full.
2. Paste `ARCHITECTURE.md`.
3. State which batch number is next. (Next is Batch 6 — `apps/web` skeleton: Vite + React 18 + TS + Tailwind + TanStack Router.)
4. State current repo state (last green commit hash if known).

The LLM should read all three governance docs before writing any code.
