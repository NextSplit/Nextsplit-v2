'use client'

// Post-log orchestration extracted from TodayClient.tsx (council /council
// 2026-05-07 P1.0 decomposition T2). Owns the full log-save → side-effects
// pipeline:
//   1. Capture session metadata + derive effective pace before await
//      (council surgical fix S1 + S2 — qa-risk + coach-domain-expert).
//   2. await logSession (training_logs upsert).
//   3. PB detection + toast (with auto-dismiss timer).
//   4. Analytics: Analytics.sessionLogged.
//   5. Fire-and-forget community-progress, community-milestone, runner-class.
//   6. Fire-and-forget squad-feed RPC (P1.1 wire-up).
//   7. Begin undo countdown via the caller-supplied beginUndo callback.
//
// Why not all-in-the-component: 100 lines of orchestration in handleLogSession
// is the largest contributor to TodayClient's surface; keeping it in a hook
// lets the component focus on rendering. Backend R2: hook MUST return
// Promise<TrainingLog | null> so callers can chain on log.id without
// reaching into hook internals.

import { useState, useCallback } from 'react'
import { Analytics } from '@/lib/analytics'
import { hapticLight, hapticSuccess } from '@/lib/haptics'
import { computePersonalBests, checkNewPB } from '@/lib/personalBests'
import { getSessionXP } from '@/lib/rpg'
import { shareSessionWithSquadAction } from '../actions'
import { creditReferralRewardIfEligibleAction } from '../referral'
import type { PlanDay, PlanSession, TrainingLog, UserPlan } from '@/types/database'

interface LogParams {
  week_n:        number
  day_i:         number
  session_i:     number
  done:          boolean
  effort?:       number
  km?:           number
  notes?:        string
  duration_secs?: number
  hr?:           number
  pace?:         string
}

interface Deps {
  plan:         UserPlan | null
  planDay:      PlanDay | null
  logs:         Record<string, TrainingLog>
  logSession:   (input: LogParams & { plan_id: string }) => Promise<TrainingLog>
  beginUndo:    (label: string, xp: number, logId: string) => void
  setShareSession: (s: { session: PlanSession; log: TrainingLog } | null) => void
  toastSuccess: (msg: string) => void
  toastError:   (msg: string) => void
}

export function useSessionLogging(deps: Deps) {
  const {
    plan, planDay, logs, logSession,
    beginUndo, setShareSession, toastSuccess, toastError,
  } = deps

  const [newPB, setNewPB] = useState<{ distance: string; timeStr: string } | null>(null)

  const handleLogSession = useCallback(async (params: LogParams): Promise<TrainingLog | null> => {
    if (!plan) return null

    // S1: capture session metadata once at call-time so date-offset shifts
    // mid-await can't leak the wrong session_name/session_type to squad_feed,
    // community endpoints, analytics, or undo state.
    const capturedSession = planDay?.sessions[params.session_i]

    // S2: derive effective pace once for every downstream consumer (PB +
    // milestone payload). Previously milestone used raw params.pace and
    // dropped derivable PB-eligible paces silently.
    let effectivePace = params.pace
    if (!effectivePace && params.duration_secs && params.km && params.km > 0) {
      const secsPerKm = params.duration_secs / params.km
      const m = Math.floor(secsPerKm / 60)
      const s = Math.round(secsPerKm % 60)
      effectivePace = `${m}:${String(s).padStart(2, '0')}`
    }

    let log: TrainingLog
    try {
      log = await logSession({ plan_id: plan.id, ...params })
    } catch {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        const { queueSession } = await import('@/lib/offlineQueue')
        await queueSession({ plan_id: plan.id, ...params })
        toastSuccess('Saved offline — will sync when back online')
        hapticLight()
        return null
      }
      toastError('Failed to save — check your connection and try again')
      return null
    }
    hapticLight()

    if (params.done) {
      Analytics.sessionLogged(capturedSession?.c ?? 'run', params.km, params.effort)
    }

    // PB detection — only fires when we have km + done + a derivable pace.
    if (params.km && params.done && effectivePace) {
      const existingPBs = computePersonalBests(Object.values(logs))
      const pb = checkNewPB(
        { km: params.km, pace: effectivePace, week_n: params.week_n, logged_at: new Date().toISOString(), done: true },
        existingPBs,
      )
      if (pb) {
        hapticSuccess()
        setNewPB({ distance: pb.distance, timeStr: pb.timeStr })
        setTimeout(() => setNewPB(null), 6000)
      }
    }

    if (params.done) {
      // Capture the response so we can dispatch the +N stat toast for the
      // character system (PR #5). Falls back silently if the response shape
      // is unexpected; non-character users get no toast.
      fetch('/api/community/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          km:           params.km ?? 0,
          done:         true,
          session_type: capturedSession?.c ?? 'run',
          session_name: capturedSession?.n ?? 'Session',
          duration_secs: params.duration_secs,
          pace:         effectivePace,
          effort:       params.effort,
        }),
      })
        .then(r => r.ok ? r.json() : null)
        .then(async (json) => {
          if (json?.character || json?.drop || json?.streak_reward) {
            const events = await import('@/lib/character-events')
            if (json.character)     events.dispatchCharacterXP(json.character)
            if (json.drop)          events.dispatchCharacterLoot(json.drop)
            if (json.streak_reward) events.dispatchStreakReward(json.streak_reward)
          }
        })
        .catch(() => {})

      fetch('/api/community/milestone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          km:           params.km ?? 0,
          pace:         effectivePace,
          session_name: capturedSession?.n ?? 'Session',
          session_type: capturedSession?.c ?? 'run',
        }),
      }).catch(() => {})

      fetch('/api/runner-class', { method: 'POST' }).catch(() => {})

      // P1.1 squad-feed fan-out — fire-and-forget. /train celebration UI
      // awaits this for its feed-card preview; here we just ensure the
      // squad sees the log. RPC errors are Sentry-captured server-side.
      shareSessionWithSquadAction(log.id).catch(() => {})

      // P2.3 referral reward — fire-and-forget. RPC short-circuits if the
      // caller wasn't referred, was already credited, or has < 5 done logs.
      // Idempotent under repeat fires; safe to call on every log.
      creditReferralRewardIfEligibleAction().catch(() => {})
    }

    beginUndo(
      capturedSession?.n ?? 'session',
      capturedSession ? getSessionXP(capturedSession.c) : 10,
      log.id,
    )
    if (capturedSession) setShareSession({ session: capturedSession, log })

    return log
  }, [plan, planDay, logs, logSession, beginUndo, setShareSession, toastSuccess, toastError])

  const dismissNewPB = useCallback(() => setNewPB(null), [])

  return { handleLogSession, newPB, dismissNewPB }
}
