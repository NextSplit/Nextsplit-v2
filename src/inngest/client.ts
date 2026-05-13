// PR J14 — Inngest client singleton.
//
// Inngest is a durable workflow + cron provider that runs OUTSIDE Vercel
// cron's 2/day Hobby cap. Free tier: 50k events/mo. Trigger jobs land at
// `/api/inngest` (see `src/app/api/inngest/route.ts`) — Inngest signs
// each invocation with INNGEST_SIGNING_KEY which the serve handler
// verifies.
//
// FOUNDER SETUP (one-time):
//   1. Sign up at https://app.inngest.com (free).
//   2. Create a new "App" pointed at https://nextsplit.app/api/inngest.
//   3. Inngest will ping the endpoint to introspect the registered
//      functions (see functions.ts).
//   4. Inngest dashboard → Settings → Signing keys → copy the signing
//      key + event key. Set on Vercel (Production + Preview):
//        INNGEST_EVENT_KEY    <event key>
//        INNGEST_SIGNING_KEY  <signing key>
//        INNGEST_PRIMARY      true       (← gates the Vercel cron routes
//                                          so they don't double-fire)
//   5. Redeploy. After deploy completes, in Inngest dashboard click
//      "Sync app" — should detect smart-notify-daily + race-tick-daily.
//   6. Optionally delete the `crons` block from vercel.json to stop
//      Vercel from invoking the routes at all.

import { Inngest } from 'inngest'

export const inngest = new Inngest({
  id:      'nextsplit',
  // Event key and signing key are auto-detected from env when present.
  eventKey: process.env.INNGEST_EVENT_KEY,
})

export function isInngestConfigured(): boolean {
  return !!(process.env.INNGEST_EVENT_KEY && process.env.INNGEST_SIGNING_KEY)
}

export function isInngestPrimary(): boolean {
  return process.env.INNGEST_PRIMARY === 'true'
}
