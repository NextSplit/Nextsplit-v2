import * as Sentry from '@sentry/nextjs'

// K32 — consent gate. Error capture itself runs on legitimate interest
// (no cookies, no PII unless we attach it) so the consent banner does
// not block it. However, when a user has explicitly DECLINED analytics,
// we strip the event of potentially-identifying URLs / breadcrumbs /
// performance traces before forwarding to Sentry. This sits well
// within ICO 2019 PECR guidance for unobtrusive error reporting.
function readConsent(): 'accepted' | 'declined' | 'pending' {
  if (typeof window === 'undefined') return 'pending'
  try {
    const stored = window.localStorage.getItem('nextsplit_cookie_consent')
    if (stored === 'accepted') return 'accepted'
    if (stored === 'declined') return 'declined'
    return 'pending'
  } catch {
    return 'pending'
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
  // tracesSampler dynamically respects consent: declined users get 0.
  tracesSampler: () => readConsent() === 'declined' ? 0 : 0.1,

  // Only enable in production
  enabled: process.env.NODE_ENV === 'production',

  // Ignore noisy browser errors that aren't ours
  ignoreErrors: [
    'ResizeObserver loop limit exceeded',
    'Non-Error promise rejection captured',
    /^Network request failed/,
    /^Load failed/,
  ],

  // K32 — strip URL/breadcrumb context when consent is declined.
  // The error itself still goes through (legitimate-interest); the
  // surrounding navigational context that would identify the user
  // does not.
  beforeSend(event) {
    if (readConsent() !== 'declined') return event
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
