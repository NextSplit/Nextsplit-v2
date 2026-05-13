// PR J17 — Upstash Redis singleton.
//
// Optional dependency: when UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
// are NOT set on Vercel, every caller of `getRedis()` gets `null` and the
// surrounding code MUST fall back to its previous path. This lets us ship
// the integration without making founder env setup a deploy blocker.
//
// To unlock:
//   1. Register at https://upstash.com (free tier: 10k cmd/day).
//   2. Create a Redis database (region: pick closest to Vercel — eu-west-1
//      if we stay on the EU stack for GDPR symmetry with Supabase EU).
//   3. Add to Vercel env (Production + Preview):
//        UPSTASH_REDIS_REST_URL    https://xxx.upstash.io
//        UPSTASH_REDIS_REST_TOKEN  <REST token>
//   4. Redeploy.

import { Redis } from '@upstash/redis'

let _redis: Redis | null = null
let _attempted = false

export function getRedis(): Redis | null {
  if (_attempted) return _redis
  _attempted = true

  const url   = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null

  _redis = new Redis({ url, token })
  return _redis
}

export function isRedisConfigured(): boolean {
  return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
}
