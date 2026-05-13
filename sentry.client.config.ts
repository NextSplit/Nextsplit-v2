import * as Sentry from '@sentry/nextjs'

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

  // Capture 10% of sessions for performance — raise once stable
  tracesSampleRate: 0.1,

  // Only enable in production
  enabled: process.env.NODE_ENV === 'production',

  // Ignore noisy browser errors that aren't ours
  ignoreErrors: [
    'ResizeObserver loop limit exceeded',
    'Non-Error promise rejection captured',
    /^Network request failed/,
    /^Load failed/,
  ],
})
