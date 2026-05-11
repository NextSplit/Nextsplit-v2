'use client'

import AcwrAdvisoryBanner from '@/components/AcwrAdvisoryBanner'
import GapRecoveryBanner from '@/components/GapRecoveryBanner'

// A2 — 1-banner priority cascade for the Train surface.
//
// Previously the top of the Train "plan" tab rendered both GapRecovery
// Banner AND AcwrAdvisoryBanner together — and in active states (e.g.
// user just returned after 10 days with ACWR creeping up) both fired
// at once, fighting for attention.
//
// This component caps the alert stack at one. Priority order:
//   1. AcwrAdvisoryBanner — injury risk for active trainers (highest)
//   2. GapRecoveryBanner  — re-engagement after a >=7d gap
//
// Each underlying banner still self-suppresses on per-user dismissal via
// localStorage. If the chosen banner is dismissed today, no replacement
// bubbles up — the dismissal acts as "I've seen the warnings, leave me
// alone for now", which is the intended UX (vs. swap-in fatigue).
//
// EliteTriggerBanner(four_weeks) and MyCoachBanner are separate concerns
// (conversion ask + status card respectively) and stay outside this
// cascade at their existing positions further down the page.

const ACWR_DANGER_THRESHOLD = 1.3
const ACWR_CHRONIC_BASELINE = 12
const GAP_DAYS_THRESHOLD    = 7

interface Props {
  latestAcwr:        number | null
  chronicBaselineKm: number
  todaySessionType:  string | undefined
  lastLoggedAt:      string | null
}

export function TrainBanners({
  latestAcwr, chronicBaselineKm, todaySessionType, lastLoggedAt,
}: Props) {
  // Priority 1 — ACWR injury-risk advisory. Trumps gap because the
  // injury signal is acute and time-sensitive (user is training right
  // now); the gap signal is reactivation framing for a different state.
  const acwrEligible =
    latestAcwr !== null
    && latestAcwr > ACWR_DANGER_THRESHOLD
    && chronicBaselineKm >= ACWR_CHRONIC_BASELINE

  if (acwrEligible) {
    return (
      <div className="mb-3">
        <AcwrAdvisoryBanner
          latestAcwr={latestAcwr!}
          chronicBaselineKm={chronicBaselineKm}
          todaySessionType={todaySessionType}
        />
      </div>
    )
  }

  // Priority 2 — Gap recovery (returning after >= 7 days).
  const gapDays = lastLoggedAt
    ? Math.floor((Date.now() - new Date(lastLoggedAt).getTime()) / 86400000)
    : null
  const gapEligible = gapDays !== null && gapDays >= GAP_DAYS_THRESHOLD

  if (gapEligible) {
    return (
      <div className="mb-3">
        <GapRecoveryBanner lastLoggedAt={lastLoggedAt} />
      </div>
    )
  }

  return null
}
