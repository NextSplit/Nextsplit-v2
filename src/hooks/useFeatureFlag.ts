'use client'

// PR J10 — PostHog feature-flag wrapper.
//
// Wraps `posthog-js/react`'s `useFeatureFlagEnabled` with two guarantees:
//   1. Returns `false` until PostHog has loaded the flag (avoids the
//      undefined → flicker on first render).
//   2. Returns the env-var override if set
//      (NEXT_PUBLIC_FF_<UPPERCASE_NAME>=true). Lets us toggle a flag from
//      Vercel env without touching the PostHog dashboard — useful during
//      smoke-testing.
//
// Flag naming convention: snake_case, namespace by feature
// e.g. 'character_3d_v1', 'race_chat_v1', 'voice_synth_v1'.

import { useFeatureFlagEnabled as _useFlagEnabled } from 'posthog-js/react'

export function useFeatureFlag(flagName: string): boolean {
  const envOverride = process.env[`NEXT_PUBLIC_FF_${flagName.toUpperCase()}`]
  if (envOverride === 'true')  return true
  if (envOverride === 'false') return false

  const enabled = _useFlagEnabled(flagName)
  return enabled === true
}
