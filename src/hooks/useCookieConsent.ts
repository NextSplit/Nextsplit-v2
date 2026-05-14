'use client'

/**
 * Cookie consent — K32 v2 (categorical, ICO-strict).
 *
 * Previously this hook tracked a single binary 'accepted' | 'declined'
 * value. The ICO 2019 PECR guidance and the EDPB 2020 cookies opinion
 * both require *granular* consent for non-essential categories — a
 * single "Accept analytics" button silently bundling analytics +
 * performance monitoring + any future surface is not a freely-given
 * specific consent.
 *
 * NextSplit's categories:
 *
 *   essential    — auth session, CSRF, the consent cookie itself.
 *                  Strictly necessary; not gated, not toggleable.
 *   analytics    — PostHog product analytics (page views, feature use).
 *   performance  — Sentry performance traces and breadcrumbs. Error
 *                  capture itself runs on legitimate interest and is
 *                  unaffected; this category covers the surrounding
 *                  navigational context.
 *
 * Storage:
 *   v2 key — 'nextsplit_cookie_consent_v1' (JSON ConsentChoice).
 *   v1 key — 'nextsplit_cookie_consent' ('accepted' | 'declined'). On
 *            first read we transparently migrate forward; the legacy
 *            key is then left in place (harmless) so a user rolling
 *            back to a pre-K32-v2 client still sees their choice.
 *
 * Versioning:
 *   `version` on the persisted record lets us force a re-prompt if
 *   the category set changes materially (e.g. adding a "marketing"
 *   category). Bump CONSENT_VERSION when that happens.
 */

import { useState, useEffect, useCallback } from 'react'

export const CONSENT_VERSION = 1
export const CONSENT_KEY     = 'nextsplit_cookie_consent_v1'
const LEGACY_KEY             = 'nextsplit_cookie_consent'

export type ConsentCategory = 'analytics' | 'performance'

export type ConsentChoice = {
  analytics:   boolean
  performance: boolean
  recordedAt:  string   // ISO 8601
  version:     number
}

export type ConsentState =
  | { status: 'pending' }
  | { status: 'recorded'; choice: ConsentChoice }

export type UseCookieConsentResult = {
  state:              ConsentState
  loaded:             boolean
  analyticsAllowed:   boolean
  performanceAllowed: boolean
  acceptAll:          () => void
  rejectAll:          () => void
  savePreferences:    (categories: { analytics: boolean; performance: boolean }) => void
  reset:              () => void
}

function readStored(): ConsentState {
  if (typeof window === 'undefined') return { status: 'pending' }
  try {
    const v1 = window.localStorage.getItem(CONSENT_KEY)
    if (v1) {
      const parsed = JSON.parse(v1) as Partial<ConsentChoice>
      if (
        typeof parsed.analytics   === 'boolean' &&
        typeof parsed.performance === 'boolean' &&
        typeof parsed.recordedAt  === 'string'  &&
        typeof parsed.version     === 'number'
      ) {
        // Re-prompt if version moved on
        if (parsed.version !== CONSENT_VERSION) return { status: 'pending' }
        return {
          status: 'recorded',
          choice: {
            analytics:   parsed.analytics,
            performance: parsed.performance,
            recordedAt:  parsed.recordedAt,
            version:     parsed.version,
          },
        }
      }
    }
    const legacy = window.localStorage.getItem(LEGACY_KEY)
    if (legacy === 'accepted' || legacy === 'declined') {
      const choice: ConsentChoice = {
        analytics:   legacy === 'accepted',
        performance: legacy === 'accepted',
        recordedAt:  new Date().toISOString(),
        version:     CONSENT_VERSION,
      }
      try { window.localStorage.setItem(CONSENT_KEY, JSON.stringify(choice)) } catch { /* ignore */ }
      return { status: 'recorded', choice }
    }
  } catch { /* ignore */ }
  return { status: 'pending' }
}

function persist(choice: ConsentChoice) {
  try {
    window.localStorage.setItem(CONSENT_KEY, JSON.stringify(choice))
    // Keep legacy key in sync for any pre-v2 reader still in flight
    // (e.g. sentry.client.config.ts during the rollout window).
    const legacy = choice.analytics && choice.performance ? 'accepted' : 'declined'
    window.localStorage.setItem(LEGACY_KEY, legacy)
  } catch { /* ignore */ }
}

export function useCookieConsent(): UseCookieConsentResult {
  const [state,  setState]  = useState<ConsentState>({ status: 'pending' })
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(readStored())
    setLoaded(true)
  }, [])

  const record = useCallback((analytics: boolean, performance: boolean) => {
    const choice: ConsentChoice = {
      analytics,
      performance,
      recordedAt: new Date().toISOString(),
      version:    CONSENT_VERSION,
    }
    persist(choice)
    setState({ status: 'recorded', choice })
  }, [])

  const acceptAll       = useCallback(() => record(true,  true),  [record])
  const rejectAll       = useCallback(() => record(false, false), [record])
  const savePreferences = useCallback(
    (c: { analytics: boolean; performance: boolean }) => record(c.analytics, c.performance),
    [record],
  )

  const reset = useCallback(() => {
    try {
      window.localStorage.removeItem(CONSENT_KEY)
      window.localStorage.removeItem(LEGACY_KEY)
    } catch { /* ignore */ }
    setState({ status: 'pending' })
  }, [])

  const analyticsAllowed   = state.status === 'recorded' && state.choice.analytics
  const performanceAllowed = state.status === 'recorded' && state.choice.performance

  return {
    state,
    loaded,
    analyticsAllowed,
    performanceAllowed,
    acceptAll,
    rejectAll,
    savePreferences,
    reset,
  }
}
