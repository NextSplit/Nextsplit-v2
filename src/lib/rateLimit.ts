/**
 * Simple in-process rate limiter for Next.js API routes.
 * Uses a Map with sliding window. Resets on server restart.
 * Good enough for pre-beta scale — upgrade to Upstash/KV at 1k+ DAU.
 */

interface RateLimitEntry {
  count:     number
  windowStart: number
}

const store = new Map<string, RateLimitEntry>()

interface RateLimitOptions {
  /** Max requests allowed per window */
  limit:    number
  /** Window duration in seconds */
  windowSecs: number
}

export interface RateLimitResult {
  allowed:    boolean
  remaining:  number
  resetInSecs: number
}

/**
 * Check and increment rate limit for a given key.
 * Key format: `route:identifier` e.g. `auth-signup:1.2.3.4`
 */
export function checkRateLimit(key: string, opts: RateLimitOptions): RateLimitResult {
  const now      = Date.now()
  const windowMs = opts.windowSecs * 1000
  const entry    = store.get(key)

  if (!entry || now - entry.windowStart > windowMs) {
    // New window
    store.set(key, { count: 1, windowStart: now })
    return { allowed: true, remaining: opts.limit - 1, resetInSecs: opts.windowSecs }
  }

  const resetInSecs = Math.ceil((entry.windowStart + windowMs - now) / 1000)

  if (entry.count >= opts.limit) {
    return { allowed: false, remaining: 0, resetInSecs }
  }

  entry.count++
  return { allowed: true, remaining: opts.limit - entry.count, resetInSecs }
}

/** Purge expired entries to prevent memory leak. Call periodically. */
export function purgeExpired(windowSecs: number) {
  const cutoff = Date.now() - windowSecs * 1000
  for (const [key, entry] of store) {
    if (entry.windowStart < cutoff) store.delete(key)
  }
}

// ─── Pre-configured limiters ─────────────────────────────────────────────────

/** Auth routes: 10 attempts per 15 min per IP */
export function authRateLimit(ip: string): RateLimitResult {
  return checkRateLimit(`auth:${ip}`, { limit: 10, windowSecs: 900 })
}

/** AI routes: 30 requests per hour per user */
export function aiRouteRateLimit(userId: string): RateLimitResult {
  return checkRateLimit(`ai:${userId}`, { limit: 30, windowSecs: 3600 })
}

/** Stripe routes: 5 checkout attempts per hour per user */
export function stripeRateLimit(userId: string): RateLimitResult {
  return checkRateLimit(`stripe:${userId}`, { limit: 5, windowSecs: 3600 })
}
