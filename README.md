# Martyn's Law Software — Product

Multi-tenant SaaS for UK Standard Tier venues (200–799 capacity) preparing for the Terrorism (Protection of Premises) Act 2025.

- **Marketing site:** [martynslawsoftware.co.uk](https://martynslawsoftware.co.uk)
- **Product (when live):** `app.martynslawsoftware.co.uk`

## Status

**Pre-launch — under active development.** Not yet feature-complete. Do not use for compliance recordkeeping until v1.0 ships and external penetration testing is complete.

## Repository structure

Turborepo monorepo. Apps and packages are added incrementally per `BUILD-LOG.md` (added in Batch 2).

```
apps/
  web/        React 18 + Vite + TypeScript SPA
  api/        Hono on Cloudflare Workers
packages/
  db/         Drizzle schema + migrations (Postgres on Neon)
  shared/     Zod schemas, types, constants shared across web/api
  email/      React Email templates
  pdf/        @react-pdf/renderer templates
  tsconfig/   Shared TypeScript configurations
```

## Stack

| Layer          | Choice                                       |
| -------------- | -------------------------------------------- |
| Frontend       | React 18, Vite, TypeScript, Tailwind CSS v4  |
| Routing        | TanStack Router                              |
| Data layer     | TanStack Query + tRPC                        |
| Backend        | Hono on Cloudflare Workers                   |
| Database       | Neon Postgres (EU) via Cloudflare Hyperdrive |
| ORM            | Drizzle                                      |
| Auth           | Clerk                                        |
| Storage        | Cloudflare R2                                |
| Email          | Resend                                       |
| Payments       | Stripe                                       |
| PDF generation | @react-pdf/renderer                          |
| Validation     | Zod                                          |
| Error tracking | Sentry                                       |
| Testing        | Vitest, Playwright, MSW                      |
| CI/CD          | GitHub Actions                               |

## Requirements

- Node 22 LTS or higher (pinned via `.nvmrc`)
- pnpm 9.15+ (pinned via `packageManager` field in `package.json`)

## Getting started

```bash
# Install dependencies for all workspaces
pnpm install

# Run all dev servers in parallel (once apps are added)
pnpm dev

# Type-check everything
pnpm typecheck

# Lint everything
pnpm lint

# Run tests
pnpm test

# Build everything
pnpm build
```

## License

Proprietary. All rights reserved. © Michael Stevenson, trading as Martyn's Law Software.
