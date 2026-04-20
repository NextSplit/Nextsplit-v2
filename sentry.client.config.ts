import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,

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
