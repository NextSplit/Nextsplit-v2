// PR J14 — Inngest serve handler.
//
// Inngest invokes this endpoint to:
//   1. Introspect the registered functions (via PUT)
//   2. Trigger function executions (via POST, signed)
//
// Signature verification uses INNGEST_SIGNING_KEY. When not set, the
// `serve()` handler still mounts but returns 401 to any unsigned caller
// — graceful no-op for environments without Inngest configured.

import { serve } from 'inngest/next'
import { inngest } from '@/inngest/client'
import { inngestFunctions } from '@/inngest/functions'

// signingKey is auto-detected by serve() from INNGEST_SIGNING_KEY env.
// When env is unset, unsigned requests get 401 — graceful no-op for
// environments without Inngest configured.
export const { GET, POST, PUT } = serve({
  client:    inngest,
  functions: inngestFunctions,
})
