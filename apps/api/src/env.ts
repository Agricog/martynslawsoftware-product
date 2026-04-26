import { z } from 'zod'
import { appEnvironment, parseEnv } from '@martynslaw/shared'

/**
 * API environment schema.
 *
 * Add new variables here as features are introduced. Every new env
 * variable required at runtime must:
 *
 *   1. Be added to this schema with appropriate validation.
 *   2. Be exposed in the Bindings interface in src/index.ts so
 *      `c.env` is correctly typed.
 *   3. Be set in Cloudflare for staging and production environments
 *      via `wrangler secret put` (secrets) or `vars` in wrangler.jsonc
 *      (non-secrets).
 *   4. Be added to .dev.vars for local development.
 */
export const envSchema = z.object({
  ENVIRONMENT: appEnvironment,
})

export type Env = z.infer<typeof envSchema>

/**
 * Validate a raw env record.
 *
 * Throws a single Error listing every missing or invalid variable.
 * Wrap in try/catch at the request boundary so misconfiguration
 * returns a clean 500 to the client and a clear error to the logs.
 */
export function validateEnv(raw: Record<string, unknown>): Env {
  return parseEnv(envSchema, raw as Record<string, string | undefined>)
}
