/**
 * Martyn's Law Software — API entry point.
 *
 * Hono on Cloudflare Workers. This file wires together the
 * cross-cutting concerns every request goes through:
 *
 *   1. Request ID generation (X-Request-Id header for log correlation)
 *   2. Security headers (Content-Security-Policy, X-Frame-Options, etc.)
 *   3. CORS (locked to the production app subdomain by default)
 *   4. Routes (health check at /health for now)
 *   5. 404 handler with consistent error shape
 *   6. Centralised error handler (sanitised responses, full server-side logging)
 *
 * Routes for business endpoints are added in subsequent batches and
 * mounted on this app.
 */

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'
import { HTTPException } from 'hono/http-exception'
import type { Env } from './env'

type Bindings = Env

type Variables = {
  requestId: string
}

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>()

/* ─── Request ID middleware ────────────────────────────────────────── */
// A UUID per request, attached to the Hono context and echoed in the
// response header. All log lines and error payloads include it for
// correlation across web, API, and Sentry.

app.use('*', async (c, next) => {
  const requestId = crypto.randomUUID()
  c.set('requestId', requestId)
  c.header('X-Request-Id', requestId)
  await next()
})

/* ─── Security headers ─────────────────────────────────────────────── */
// Hono's secureHeaders sets sensible defaults: X-Content-Type-Options,
// X-Frame-Options, Referrer-Policy, Strict-Transport-Security, etc.

app.use('*', secureHeaders())

/* ─── CORS ─────────────────────────────────────────────────────────── */
// Locked to the production app subdomain. Local dev origins are added
// when the web app is wired up in a later batch.

app.use(
  '*',
  cors({
    origin: ['https://app.martynslawsoftware.co.uk'],
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
    credentials: true,
    maxAge: 600,
  }),
)

/* ─── Health check ─────────────────────────────────────────────────── */
// Used by Cloudflare's health monitoring, uptime probes, and humans
// confirming a deploy. Returns enough context to be useful, no PII.

app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    environment: c.env.ENVIRONMENT,
    requestId: c.var.requestId,
    timestamp: new Date().toISOString(),
  })
})

/* ─── 404 ──────────────────────────────────────────────────────────── */

app.notFound((c) => {
  return c.json(
    {
      error: {
        message: 'Not found',
        status: 404,
        requestId: c.var.requestId,
      },
    },
    404,
  )
})

/* ─── Centralised error handler ────────────────────────────────────── */
// HTTPException → original status, sanitised JSON body.
// Anything else → 500 with a generic message; full detail goes to logs.

app.onError((err, c) => {
  const requestId = c.var.requestId

  if (err instanceof HTTPException) {
    return c.json(
      {
        error: {
          message: err.message,
          status: err.status,
          requestId,
        },
      },
      err.status,
    )
  }

  console.error('Unhandled error', {
    requestId,
    error: err instanceof Error ? { name: err.name, message: err.message, stack: err.stack } : err,
  })

  return c.json(
    {
      error: {
        message: 'Internal server error',
        status: 500,
        requestId,
      },
    },
    500,
  )
})

export default app
