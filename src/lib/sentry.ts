/**
 * Client-safe Sentry wrapper.
 * Use this in client components instead of importing @sentry/nextjs directly.
 * API routes can continue to import @sentry/nextjs directly.
 */

export function captureException(err: unknown, context?: Record<string, unknown>) {
  try {
    // Dynamic import works in both client and server contexts
    import('@sentry/nextjs').then(Sentry => {
      Sentry.captureException(err, context ? { extra: context } : undefined)
    }).catch(() => {
      // Sentry not available - silent fail
    })
  } catch {
    // Silent fail - never let error reporting break the app
  }
}
