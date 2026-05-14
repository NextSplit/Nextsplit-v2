import * as Sentry from '@sentry/nextjs'

// K32 v2 — categorical consent gate. Error capture itself runs on
// legitimate interest (no cookies, no PII unless we attach it) so the
// banner does not block it. The PERFORMANCE category gates:
//   • performance traces (tracesSampler returns 0 when not allowed)
//   • surrounding navigational context on errors (URL, breadcrumbs,
//     headers — stripped in beforeSend when not allowed)
// We read the v2 record directly to avoid pulling React hooks into
// the Sentry init path, with a v1 fallback so a partial-rollout
// client still gets the right behaviour.
function performanceAllowed(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const v1 = window.localStorage.getItem('nextsplit_cookie_consent_v1')
    if (v1) {
      const parsed = JSON.parse(v1) as { performance?: unknown }
      return parsed?.performance === true
    }
    const legacy = window.localStorage.getItem('nextsplit_cookie_consent')
    return legacy === 'accepted'
  } catch {
    return false
  }
}

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,

  // PR J4 — tag every event with the Vercel commit SHA so regressions
  // can be traced back to the deploy that introduced them. Sentry
  // auto-derives this for sourcemap upload, but without an explicit
  // `release` field events fall into a generic "no release" bucket on
  // the Releases tab.
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA
    ?? process.env.VERCEL_GIT_COMMIT_SHA
    ?? undefined,

  // Capture 10% of sessions for performance — raise once stable.
  // tracesSampler dynamically respects consent: users who have not
  // granted the performance category get 0.
  tracesSampler: () => performanceAllowed() ? 0.1 : 0,

  // Only enable in production
  enabled: process.env.NODE_ENV === 'production',

  // Ignore noisy browser errors that aren't ours
  ignoreErrors: [
    'ResizeObserver loop limit exceeded',
    'Non-Error promise rejection captured',
    /^Network request failed/,
    /^Load failed/,
  ],

  // K32 v2 — strip URL/breadcrumb context when performance consent
  // is absent. The error itself still goes through (legitimate
  // interest); the surrounding navigational context that would
  // identify the user does not.
  beforeSend(event) {
    if (performanceAllowed()) return event
    if (event.request) {
      delete event.request.url
      delete event.request.cookies
      delete event.request.headers
      delete event.request.query_string
    }
    delete event.breadcrumbs
    delete event.user
    return event
  },
})
