/**
 * Environment variable validation helpers.
 *
 * Each app (web, api) defines its own concrete env schema by composing
 * these helpers. Validation runs at startup and fails loud — never
 * silently default a missing secret.
 *
 * Usage:
 *
 *   import { z } from 'zod'
 *   import { parseEnv, postgresUrl, prefixedKey } from '@martynslaw/shared'
 *
 *   const env = parseEnv(
 *     z.object({
 *       DATABASE_URL: postgresUrl(),
 *       CLERK_SECRET_KEY: prefixedKey('sk_'),
 *     }),
 *     process.env,
 *   )
 */

import { z } from 'zod'

/* ─── Reusable validators ──────────────────────────────────────────── */

/** Non-empty trimmed string. */
export const nonEmptyString = (): z.ZodString => z.string().trim().min(1, 'must not be empty')

/** HTTPS URL. Rejects http://, ws://, file://, etc. */
export const httpsUrl = (): z.ZodString =>
  z
    .string()
    .url()
    .refine((u) => u.startsWith('https://'), {
      message: 'must be an https:// URL',
    })

/** Postgres connection string. */
export const postgresUrl = (): z.ZodString =>
  z
    .string()
    .url()
    .refine((u) => u.startsWith('postgres://') || u.startsWith('postgresql://'), {
      message: 'must be a postgres:// or postgresql:// connection string',
    })

/**
 * Key beginning with a specific prefix.
 *
 * Examples:
 *   prefixedKey('sk_')   // Stripe secret key
 *   prefixedKey('pk_')   // Stripe publishable key
 *   prefixedKey('whsec_') // Stripe webhook secret
 *   prefixedKey('re_')   // Resend API key
 */
export const prefixedKey = (prefix: string): z.ZodString =>
  z
    .string()
    .min(prefix.length + 1)
    .refine((s) => s.startsWith(prefix), {
      message: `must begin with "${prefix}"`,
    })

/** Application environment names. */
export const appEnvironment = z.enum(['development', 'staging', 'production', 'test'])
export type AppEnvironment = z.infer<typeof appEnvironment>

/* ─── parseEnv ─────────────────────────────────────────────────────── */

/**
 * Parse a record (e.g. process.env, import.meta.env) against a Zod
 * schema. Throws a single Error listing every missing or invalid
 * variable in human-readable form. Never logs values — error messages
 * include only variable names and validation failures.
 */
export function parseEnv<T extends z.ZodTypeAny>(
  schema: T,
  source: Record<string, string | undefined>,
): z.infer<T> {
  const result = schema.safeParse(source)
  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => {
        const path = issue.path.length > 0 ? issue.path.join('.') : '<root>'
        return `  • ${path}: ${issue.message}`
      })
      .join('\n')
    throw new Error(`Invalid environment configuration:\n${formatted}`)
  }
  return result.data as z.infer<T>
}
