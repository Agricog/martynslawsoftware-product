/**
 * Domain constants for the Martyn's Law product.
 *
 * Statutory values (capacity thresholds, dates) reflect the
 * Terrorism (Protection of Premises) Act 2025. Update only with
 * direct reference to the legislation or revised statutory guidance.
 */

/* ─── Capacity tier thresholds ─────────────────────────────────────── */

/**
 * Standard tier lower bound (inclusive). Below this the venue is
 * out of scope of Martyn's Law duties.
 */
export const STANDARD_TIER_MIN_CAPACITY = 200

/**
 * Standard tier upper bound (exclusive). At this capacity and above
 * a venue moves to Enhanced tier with materially heavier duties.
 */
export const ENHANCED_TIER_MIN_CAPACITY = 800

/* ─── Statutory dates (ISO 8601) ───────────────────────────────────── */

/** Royal Assent of the Terrorism (Protection of Premises) Act 2025. */
export const ROYAL_ASSENT_DATE = '2025-04-03'

/** Statutory guidance publication date. */
export const STATUTORY_GUIDANCE_DATE = '2026-04-15'

/** Earliest enforcement (subject to government commencement orders). */
export const EARLIEST_ENFORCEMENT_DATE = '2027-04-01'

/* ─── Locale and timezone ──────────────────────────────────────────── */

export const DEFAULT_LOCALE = 'en-GB'
export const DEFAULT_TIMEZONE = 'Europe/London'
export const DEFAULT_COUNTRY = 'GB'
export const DEFAULT_CURRENCY = 'GBP'

/* ─── Compliance retention ─────────────────────────────────────────── */

/** Audit log retention. Compliance evidence requirement. */
export const AUDIT_LOG_RETENTION_YEARS = 7

/** Soft-delete grace period before anonymise-and-purge. */
export const SOFT_DELETE_GRACE_DAYS = 90

/** Cancelled subscription grace period before hard delete. */
export const CANCELLATION_GRACE_DAYS = 30

/* ─── Operational defaults ─────────────────────────────────────────── */

/** Default rate limit for unauthenticated routes (per IP per minute). */
export const DEFAULT_RATE_LIMIT_UNAUTH = 60

/** Default rate limit for authenticated routes (per user per minute). */
export const DEFAULT_RATE_LIMIT_AUTH = 600

/* ─── Subscription tiers ───────────────────────────────────────────── */

/**
 * Tier identifiers. Map to Stripe price IDs at runtime via the API
 * env config. Order matches the marketing site pricing page.
 */
export const TIER_IDS = {
  STARTER: 'starter',
  STANDARD: 'standard',
  CHAIN: 'chain',
  ENHANCED: 'enhanced',
} as const

export type TierId = (typeof TIER_IDS)[keyof typeof TIER_IDS]

/** Tiers available at MVP launch. Others are roadmapped. */
export const MVP_TIERS: readonly TierId[] = [TIER_IDS.STANDARD]
