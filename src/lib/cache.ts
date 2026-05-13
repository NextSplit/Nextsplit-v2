// PR J17 — Upstash-backed hot-read cache helper.
//
// Use for short-TTL reads where DB latency adds up:
//   - leaderboard top-N (cached 30s)
//   - daily-race active entrants (cached 30s)
//   - PostHog feature-flag evaluations (cached 60s)
//
// Cache misses fall through to the loader. When Upstash isn't configured,
// the loader runs on every call (current behaviour) — graceful no-op.
//
// Typical usage:
//   const top10 = await cachedRead(
//     'leaderboard:season-current:top10',
//     30,
//     () => db().from('leaderboard').select().limit(10),
//   )

import { getRedis } from './redis'

export async function cachedRead<T>(
  key:    string,
  ttlSec: number,
  loader: () => Promise<T>,
): Promise<T> {
  const redis = getRedis()
  if (!redis) return loader()

  try {
    const cached = await redis.get<T>(key)
    if (cached !== null && cached !== undefined) return cached
  } catch {
    // Upstash transient error — fall through to loader, don't cache
    return loader()
  }

  const fresh = await loader()
  try {
    await redis.set(key, fresh, { ex: ttlSec })
  } catch {
    // Non-fatal — we have the value, caching failed
  }
  return fresh
}

export async function invalidate(key: string): Promise<void> {
  const redis = getRedis()
  if (!redis) return
  try { await redis.del(key) } catch { /* non-fatal */ }
}
