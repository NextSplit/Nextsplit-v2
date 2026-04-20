'use client'

import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { useEffect } from 'react'

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
    if (!key) return

    posthog.init(key, {
      api_host:             process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com',
      person_profiles:      'identified_only',
      capture_pageview:     false, // We handle this manually per route
      capture_pageleave:    true,
      autocapture:          false, // Manual events only — keeps data clean
      disable_session_recording: process.env.NODE_ENV !== 'production',
      loaded: (ph) => {
        if (process.env.NODE_ENV !== 'production') ph.opt_out_capturing()
      },
    })
  }, [])

  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return <>{children}</>

  return <PHProvider client={posthog}>{children}</PHProvider>
}
