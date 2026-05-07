// Surfaces the server-only `PREMIUM_ENFORCED` flag to the client as
// `isDevMode`. Council /council 2026-05-07 P1.3: the flag itself stays
// out of the client bundle — only its boolean effect leaks, gated by
// the server's reading of process.env.PREMIUM_ENFORCED.
//
// Returned shape: { isDevMode: boolean }
//   true  → premium NOT enforced; ProGate shows children for every feature
//   false → premium IS enforced; ProGate runs canAccess against the user's
//           tier
//
// No auth required: the flag is uniform across all users (operational
// rollout switch, not a per-user toggle). If we ever need per-user
// overrides (e.g., founding members bypass), gate that here.

import { NextResponse } from 'next/server'
import { serverConfig } from '@/lib/config'

export async function GET() {
  return NextResponse.json(
    { isDevMode: !serverConfig.premiumEnforced },
    {
      headers: {
        // Edge-cacheable for 60s; flips here propagate within a minute
        // without stampeding our origin on every page nav.
        'Cache-Control': 'public, max-age=60, s-maxage=60',
      },
    },
  )
}
