# Security Policy

> If you have found a security issue, please follow [Reporting a vulnerability](#reporting-a-vulnerability) below.

This document covers vulnerability disclosure, the threat model, incident response, and data-handling commitments for the Martyn's Law Software product (`app.martynslawsoftware.co.uk`).

---

## Reporting a vulnerability

**Email: `security@martynslawsoftware.co.uk`**

If the issue is sensitive, request a PGP key in a first message and we will respond with one.

We commit to:

- Acknowledging receipt within 2 business days.
- Providing a substantive response (severity assessment + planned remediation timeline) within 7 business days.
- Coordinating disclosure: we ask for 90 days from acknowledgement to remediate before public disclosure, or sooner if the issue is already being actively exploited.
- Crediting the reporter in any public advisory unless they request anonymity.

We do not currently run a paid bug bounty programme.

### What we ask reporters to avoid

- Automated scanners that generate significant traffic.
- Testing against other customers' data.
- Social engineering of staff or customers.
- Physical or network-layer attacks against our infrastructure providers (Cloudflare, Neon, etc.) — report those to the providers directly.

### In scope

- The product domain `app.martynslawsoftware.co.uk` and its API.
- The marketing site `martynslawsoftware.co.uk` (separate repo, but report here).
- Any subdomain we operate.

### Out of scope

- Reports based solely on missing security headers without a demonstrated exploit.
- Reports of best-practice deviations without exploitable consequences (e.g. "your TLS version supports cipher X").
- Vulnerabilities in third-party services we depend on (report to that provider).
- DoS / DDoS issues — these are handled at Cloudflare's edge and not in our control.

---

## Supported versions

Until v1.0 ships, the product is pre-release. Only the current `main` branch receives security fixes.

Post-v1.0 we will support the latest minor release with security patches; older minors may receive critical-only patches at our discretion.

---

## Threat model summary

Detailed threat modelling is performed quarterly and before any major architectural change. Summary of assets and adversaries:

### Assets

1. **Customer compliance evidence.** Regulatory evidence packs, drill logs, training records. Loss or tampering = customers fail SIA inspections. Highest integrity requirement.
2. **Personal data.** Staff names, emails, employment records (covered by UK GDPR). Highest confidentiality requirement.
3. **Authentication credentials.** Clerk-managed but our session tokens, JWTs, API keys are in scope.
4. **Payment data.** Card data is held by Stripe, never touches our infrastructure. Stripe IDs and billing metadata are in scope.
5. **Source code and infrastructure secrets.** Stored in GitHub (private) and Cloudflare/Wrangler (encrypted bindings).

### Adversaries (in priority order)

1. **Opportunistic external attackers** (commodity exploit kits, automated credential stuffing).
2. **Compromised customer accounts** (used to pivot into other tenants — multi-tenancy isolation must hold).
3. **Insider threat** (single sole-trader operator currently — controls described below).
4. **Supply-chain attacks** (malicious npm packages, typosquatting). Mitigated via Dependabot, Snyk, and lockfile review.
5. **State-level / advanced persistent threats.** Out of realistic scope for current scale; partially mitigated by Cloudflare's edge.

### Key controls

- **Tenant isolation** enforced at every query (`organisation_id` filter).
- **Authentication** via Clerk (SOC 2 Type 2, MFA mandatory for owner/admin roles).
- **Transport security**: TLS 1.2+ end-to-end, HSTS preloaded (post-v1.0).
- **Application secrets** never committed to source. Wrangler secrets, GitHub Actions secrets only.
- **Audit log** captures every mutation, retained 7 years.
- **Rate limiting** at Cloudflare edge for unauthenticated routes; per-user for authenticated.
- **Idempotency** on all mutations.
- **Backup**: Neon point-in-time recovery (7 days), R2 versioning, quarterly restore drill.
- **Dependency hygiene**: Dependabot weekly, Snyk on every PR, GitHub CodeQL on every push.

---

## Incident response

### Definition

A security incident is any event that may have caused unauthorised access to, modification of, or disclosure of customer data; or a significant disruption to service.

### Procedure

1. **Detection.** Source: Sentry alert, customer report, monitoring alarm, security researcher.
2. **Containment.** Within 1 hour of detection (target):
   - Rotate any compromised credentials.
   - Disable any compromised accounts.
   - Block attacker IPs at Cloudflare WAF if applicable.
3. **Assessment.** Within 4 hours:
   - Scope: which tenants affected? Which records? Which fields?
   - Severity: was data accessed, modified, exfiltrated?
4. **Notification.**
   - **ICO**: within 72 hours of becoming aware, if the incident risks individuals' rights and freedoms (UK GDPR Art. 33).
   - **Affected customers**: without undue delay, in plain English, with what we know and what we're doing.
   - **All customers** (if non-affected): if the incident shapes their threat picture (e.g. a class of vulnerability now patched).
5. **Remediation.** Patch, deploy, verify.
6. **Post-mortem.** Written within 14 days. Includes timeline, root cause, what worked, what didn't, prevention actions. Published to customers in summary form.

The current operator is a sole trader. Out-of-hours availability is best-effort. Customers are informed of this in the SLA.

---

## Data handling commitments

### Data residency

- Application data: Neon Postgres in EU region (Frankfurt or London).
- File storage: Cloudflare R2 in EU region.
- Email: Resend EU region.
- Errors / logs: Sentry EU region. Workers logs at edge — by Cloudflare design, processing happens at the nearest point of presence; aggregated logs stored in R2 EU.

### Retention

- **Live customer data**: held while subscription is active.
- **Audit log**: 7 years (compliance evidence requirement).
- **Soft-deleted records**: 90 days, then anonymised.
- **Backups**: Neon PITR 7 days, R2 versioning 30 days.
- **Application logs**: 30 days.
- **Sentry events**: 30 days.

On subscription cancellation:

- 30 days grace period (data retained, account read-only).
- Day 31: customer can request data export (CSV + PDF evidence packs) — fulfilled within 14 days.
- Day 90: hard delete of all tenant data, except audit log and billing records (retained 7 years for legal/tax).

### Sub-processors

A current list of sub-processors is published at `/sub-processors` on the marketing site. Customers receive 30 days' notice of any change via email and a public changelog entry. Standing list:

- Cloudflare (hosting, DNS, R2 storage, CDN)
- Neon (database)
- Clerk (authentication)
- Stripe (payments)
- Resend (transactional email)
- Sentry (error tracking)

### Data subject rights (UK GDPR)

We respond to data subject requests within 30 days:

- Right of access — data export available in-app for owners; on request for others.
- Right to rectification — self-service in-app, or via support.
- Right to erasure — handled via the cancellation flow above, or on direct request.
- Right to data portability — CSV + JSON export.
- Right to object / restrict — handled case by case.

Data subject requests: `privacy@martynslawsoftware.co.uk`.

---

## Operational hardening

Status as of repo Batch 2:

| Control                              | Status                                         |
| ------------------------------------ | ---------------------------------------------- |
| HTTPS-only (HSTS)                    | Pending — set up at app subdomain post-v1.0    |
| MFA mandatory for staff              | Pending — Clerk policy at first user creation  |
| Dependabot                           | Pending — Batch 3                              |
| CodeQL                               | Pending — Batch 3                              |
| Snyk                                 | Pending — Batch 3                              |
| Sentry PII scrubbing                 | Pending — Batch 3 (API foundation)             |
| External pen test                    | Pre-launch — booked when v1.0 feature-complete |
| ICO registration                     | Pre-launch — operator action item              |
| DPA template                         | Pre-launch — operator action item              |
| Privacy policy v2 (product addendum) | Pre-launch — operator action item              |

Items marked "Pre-launch" are tracked in the operator's `LAUNCH-CHECKLIST.md` (separate from this code repo) and not blocked by code work, but block the first paid customer onboarding.
