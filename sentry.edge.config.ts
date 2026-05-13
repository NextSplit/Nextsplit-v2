import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  // PR J4 — release tag for regression tracing (Vercel commit SHA).
  release: process.env.VERCEL_GIT_COMMIT_SHA ?? undefined,
  tracesSampleRate: 0.1,
  enabled: process.env.NODE_ENV === 'production',
})
