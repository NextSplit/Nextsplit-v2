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
//
// PECR compliance (P1.2 audit, council /council 2026-05-07): the previous
// implementation called posthog.init() on every mount and only opted out
// inside the `loaded` callback. That meant the PostHog script — and its
// persistent session cookie — landed BEFORE consent was confirmed. ICO 2019
// guidance: no non-essential cookie may be set before opt-in.
//
// Fix: gate posthog.init behind consent === 'accepted'. While consent is
// 'pending' or 'declined' (or dev), init never runs and no cookie is set.
// When the user later accepts in Settings, the consent effect re-fires and
// init runs at that point. Once initialised, opt-in/opt-out semantics
// continue to apply for any later toggle.
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const key                  = config.posthogKey
  const host                 = config.posthogHost
  const { consent, loaded }  = useCookieConsent()

  useEffect(() => {
    if (!key) return
    if (!loaded) return                              // wait for localStorage check
    if (process.env.NODE_ENV !== 'production') return // never init in dev
    if (consent !== 'accepted') return               // PECR gate: no init pre-consent

    // posthog.__loaded is set to true after init; guard against double-init
    // when the consent effect re-fires (StrictMode double-invoke + later
    // setting changes).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((posthog as any).__loaded) {
      posthog.opt_in_capturing()
      return
    }

    // PR J10 — session replay sampling.
    // The dashboard-side toggle in PostHog Project Settings → Session Replay
    // must also be ON for any recording to happen. With both client-side
    // sample_rate AND server-side capture enabled, 10% of sessions are
    // captured by default (PII masked).
    // To change: set NEXT_PUBLIC_POSTHOG_REPLAY_SAMPLE_RATE on Vercel
    // (e.g. '0.05' for 5%, '1.0' for 100% during a debugging window).
    const replayRate = Number(process.env.NEXT_PUBLIC_POSTHOG_REPLAY_SAMPLE_RATE ?? '0.1')
    posthog.init(key, {
      api_host:           host,
      ui_host:            'https://eu.posthog.com',
      person_profiles:    'identified_only',
      capture_pageview:   false, // handled by PageViewTracker above
      capture_pageleave:  true,
      autocapture:        false, // manual events only — keeps data clean
      session_recording: {
        maskAllInputs:    true,  // never record passwords/sensitive fields
        maskInputOptions: { password: true },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...({
        // Sampling lives at the top level of init opts in posthog-js v1.270+
        session_replay_sample_rate: Number.isFinite(replayRate) ? replayRate : 0.1,
      } as any),
    })
  }, [key, host, loaded, consent])

  // Respond to a later consent change — opt out without uninstalling.
  // (PostHog has no clean uninit API; opt_out_capturing stops events but
  // already-set cookies persist until they expire or the user clears them.
  // To wipe cookies on decline, posthog.reset() is called in the effect.)
  useEffect(() => {
    if (!key || process.env.NODE_ENV !== 'production') return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!(posthog as any).__loaded) return // not yet initialised — nothing to opt
    if (consent === 'declined') {
      posthog.opt_out_capturing()
      try { posthog.reset() } catch { /* no session to reset */ }
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
