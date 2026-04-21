'use client'

import posthog from 'posthog-js'
import { PostHogProvider as PHProvider, usePostHog } from 'posthog-js/react'
import { useEffect, Suspense } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { config } from '@/lib/config'
import { useCookieConsent } from '@/hooks/useCookieConsent'

// ── Page view tracker — fires on every route change ───────────────────────────
function PageViewTracker() {
  const pathname     = usePathname()
  const searchParams = useSearchParams()
  const ph           = usePostHog()

  useEffect(() => {
    if (!ph) return
    const url = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '')
    ph.capture('$pageview', { $current_url: url })
  }, [pathname, searchParams, ph])

  return null
}

// ── Main provider ─────────────────────────────────────────────────────────────
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const key            = config.posthogKey
  const host           = config.posthogHost
  const { consent }    = useCookieConsent()

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
          return
        }
        // Gate on cookie consent — ICO compliance requirement
        if (consent === 'declined' || consent === 'pending') {
          ph.opt_out_capturing()
        } else {
          ph.opt_in_capturing()
        }
      },
    })
  }, [key, host]) // init once only

  // Respond to consent changes after init (user changes preference in Settings)
  useEffect(() => {
    if (!key || process.env.NODE_ENV !== 'production') return
    if (consent === 'accepted') {
      posthog.opt_in_capturing()
    } else if (consent === 'declined') {
      posthog.opt_out_capturing()
    }
  }, [consent, key])

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
