'use client'

import posthog from 'posthog-js'
import { PostHogProvider as PHProvider, usePostHog } from 'posthog-js/react'
import { useEffect, Suspense } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

// ── Page view tracker — fires on every route change ───────────────────────────
function PageViewTracker() {
  const pathname    = usePathname()
  const searchParams = useSearchParams()
  const ph          = usePostHog()

  useEffect(() => {
    if (!ph) return
    // Build full URL for tracking
    const url = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '')
    ph.capture('$pageview', { $current_url: url })
  }, [pathname, searchParams, ph])

  return null
}

// ── Main provider ─────────────────────────────────────────────────────────────
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const key  = process.env.NEXT_PUBLIC_POSTHOG_KEY
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com'

  useEffect(() => {
    if (!key) return

    posthog.init(key, {
      api_host:                  host,
      ui_host:                   'https://eu.posthog.com',
      person_profiles:           'identified_only',
      capture_pageview:          false, // handled by PageViewTracker above
      capture_pageleave:         true,
      autocapture:               false, // manual events only — keeps data clean
      session_recording: {
        maskAllInputs:           true,  // never record passwords/sensitive fields
        maskInputOptions:        { password: true },
      },
      loaded: (ph) => {
        // Disable in dev so local usage doesn't pollute analytics
        if (process.env.NODE_ENV !== 'production') {
          ph.opt_out_capturing()
        }
      },
    })
  }, [key, host])

  if (!key) return <>{children}</>

  return (
    <PHProvider client={posthog}>
      <Suspense fallback={null}>
        <PageViewTracker />
      </Suspense>
      {children}
    </PHProvider>
  )
}
