/**
 * Branded primitive types.
 *
 * Branded (a.k.a. nominal) types stop accidental mixing of IDs that share
 * the same underlying primitive. A `VenueId` is a string at runtime but
 * cannot be passed where an `OrganisationId` is expected — the compiler
 * treats them as distinct types.
 *
 * Construct branded values only at trust boundaries (after Zod validation
 * of database rows, request payloads, or external API responses). Inside
 * the codebase, treat them as opaque.
 */

declare const __brand: unique symbol

export type Brand<T, B extends string> = T & { readonly [__brand]: B }

/* ─── Identity ─────────────────────────────────────────────────────── */

export type UserId = Brand<string, 'UserId'>
export type OrganisationId = Brand<string, 'OrganisationId'>
export type MembershipId = Brand<string, 'MembershipId'>

/* ─── Tenancy entities ─────────────────────────────────────────────── */

export type VenueId = Brand<string, 'VenueId'>
export type ProcedureId = Brand<string, 'ProcedureId'>
export type DrillId = Brand<string, 'DrillId'>
export type StaffId = Brand<string, 'StaffId'>
export type TrainingRecordId = Brand<string, 'TrainingRecordId'>
export type DocumentId = Brand<string, 'DocumentId'>
export type EvidencePackId = Brand<string, 'EvidencePackId'>

/* ─── Audit ────────────────────────────────────────────────────────── */

export type AuditLogEntryId = Brand<string, 'AuditLogEntryId'>

/* ─── Billing ──────────────────────────────────────────────────────── */

export type SubscriptionId = Brand<string, 'SubscriptionId'>
export type StripeCustomerId = Brand<string, 'StripeCustomerId'>
export type StripeSubscriptionId = Brand<string, 'StripeSubscriptionId'>
export type StripePriceId = Brand<string, 'StripePriceId'>

/* ─── Idempotency ──────────────────────────────────────────────────── */

export type IdempotencyKey = Brand<string, 'IdempotencyKey'>
