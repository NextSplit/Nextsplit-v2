'use client'

import { useMemo, useState, useEffect } from 'react'
import Link from 'next/link'
import MilestoneShareCard from '@/components/MilestoneShareCard'
import { useActivePlan } from '@/hooks/useActivePlan'
import { useAllTrainingLogs } from '@/hooks/useAllTrainingLogs'
import { useProfile } from '@/hooks/useProfile'
import { useSquad } from '@/hooks/useSquad'
import { useMyCoach } from '@/hooks/useCoach'
import { useSubscription } from '@/hooks/useSubscription'
import { useNotifications } from '@/hooks/useNotifications'
import { computeStreak } from '@/lib/streak'
import type { PlanSession, PlanWeek, TrainingLog } from '@/types/database'
import Splity from '@/components/Splity'
import DailyQuests from '@/components/DailyQuests'
import { RaceCard } from '@/components/race/RaceCard'
import { EliteTriggerBanner } from '@/components/EliteTriggerBanner'
import { MotivationDipBanner } from '@/components/MotivationDipBanner'
import FoundingCountdown from '@/components/FoundingCountdown'
import { TrialBanner } from '@/components/TrialBanner'
import { TrialLapsedBanner } from '@/components/TrialLapsedBanner'
import { TrialWelcomeModal, shouldShowTrialWelcome } from '@/components/TrialWelcomeModal'
import { todayDayIndex, getWeeklyKm, getTodaySessions } from './_helpers'
import {
  HeroTraining, HeroTrainingDone, HeroRest, HeroStreakAtRisk, HeroNoPlan, HeroCoach,
  type HeroState,
} from './HomeHeroes'
import { XPHeaderBar, RaceCountdown, StatsStrip, SquadMini, NotifStrip } from './HomeChrome'
import { CoachNudge, SquadNudge, EliteNudge } from './HomeNudges'

export default function HomeClient() {
  const { plan }                                    = useActivePlan()
  const { logs: allLogs }                           = useAllTrainingLogs()
  const { profile }                                 = useProfile()
  const { squad }                                   = useSquad()
  const { coach, hasCoach }                         = useMyCoach()
  const { isPro, isTrialing, trialDaysLeft, isTrialLapsed, trialLapsedDaysAgo, subscription } = useSubscription()
  const { notifications, markRead, markOpened }     = useNotifications()
  const [showStreakShare, setShowStreakShare]       = useState(false)
  // PR K — trial welcome modal. Fires on first mount where the user is
  // trialing AND the per-user localStorage flag isn't set. Once dismissed,
  // never re-shows for this user on this device.
  const [showTrialWelcome, setShowTrialWelcome]     = useState(false)
  const profileId = (profile as { id?: string } | null)?.id ?? null
  useEffect(() => {
    if (isTrialing && profileId && shouldShowTrialWelcome(profileId)) {
      setShowTrialWelcome(true)
    }
  }, [isTrialing, profileId])

  const streak   = useMemo(() =>
    computeStreak(allLogs.map((l: TrainingLog) => ({ logged_at: l.created_at, done: l.done }))).current,
    [allLogs])
  const weeklyKm = useMemo(() => getWeeklyKm(allLogs), [allLogs])
  const xp       = useMemo(() => allLogs.filter((l: TrainingLog) => l.done).length * 15, [allLogs])

  const firstName = (profile?.display_name as string | null)?.split(' ')[0] ?? 'runner'
  const hour      = new Date().getHours()
  const greeting  = hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : 'Evening'

  const todaySessions  = useMemo(() => getTodaySessions(plan), [plan])
  const isRestDay      = plan && todaySessions.length === 0
  const hasLoggedToday = allLogs.some((l: TrainingLog) =>
    l.done && l.created_at.startsWith(new Date().toISOString().slice(0, 10)))
  const streakAtRisk   = streak > 0 && hour >= 19 && !hasLoggedToday

  // P4.4 motivation-dip trigger — no done log in last 3 days. Combined
  // with !hasCoach + active plan in the banner mount below.
  const noDoneLast3Days = useMemo(() => {
    const cutoff = Date.now() - 3 * 24 * 3600 * 1000
    return !allLogs.some((l: TrainingLog) =>
      l.done && new Date(l.created_at).getTime() >= cutoff)
  }, [allLogs])

  const nextSessions = useMemo((): PlanSession[] => {
    if (!plan?.weeks_data) return []
    const weeks = plan.weeks_data as unknown as PlanWeek[]
    const cw    = weeks.find(w => w.n === plan.current_week)
    if (!cw) return []
    const tomorrowI = (todayDayIndex() + 1) % 7
    return (cw.days?.[tomorrowI]?.sessions ?? []).filter((s: PlanSession) => s.c && s.c !== 'rest')
  }, [plan])

  const daysToRace = plan?.race_date
    ? Math.ceil((new Date(plan.race_date).getTime() - Date.now()) / 86400000)
    : null

  const heroState: HeroState = !plan
    ? 'no_plan'
    : streakAtRisk
      ? 'streak_risk'
      : hasCoach && coach && !plan
        ? 'coach'
        : !isRestDay
          ? (hasLoggedToday ? 'training_done' : 'training')
          : 'rest'

  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--color-bg)' }}>

      {/* Sticky header */}
      <div className="sticky top-0 z-40"
        style={{ background: 'var(--color-surface)', borderBottom: '2.5px solid var(--color-border-2)' }}>
        <div className="max-w-lg mx-auto px-4 pt-12 pb-1 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Splity size={32} mood={streakAtRisk ? 'worried' : plan ? 'happy' : 'idle'} animate={false} />
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest"
                style={{ color: 'var(--color-text-tertiary)' }}>
                {greeting}, {firstName}
              </p>
              <p className="text-base font-black leading-tight"
                style={{ color: '#00d4ff', letterSpacing: '-0.02em' }}>NextSplit</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/settings" aria-label="Settings"
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: 'var(--color-surface-2)', border: '2px solid var(--color-border-2)' }}>
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none"
                stroke="var(--color-text-tertiary)" strokeWidth={2}>
                <circle cx={12} cy={12} r={3} />
                <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
              </svg>
            </Link>
          </div>
        </div>
        <XPHeaderBar xp={xp} streak={streak} hasPlan={!!plan} onShareStreak={() => setShowStreakShare(true)} />
      </div>

      <div className="max-w-lg mx-auto py-4 space-y-3">

        <NotifStrip notifications={notifications} markRead={markRead} markOpened={markOpened} />

        {/* Today's character race — compact teaser linking to /race */}
        <RaceCard variant="compact" />

        {/* BL-C6 — trial countdown. Sits above FoundingCountdown when active
            because the immediate decision (lock in price before trial expires)
            outranks the always-on founding pitch. */}
        <TrialBanner
          show={isTrialing}
          trialDaysLeft={trialDaysLeft}
          trialSource={subscription.trialSource}
        />

        {/* PR N — trial-lapsed winback. Mirrors the day-14 expiry push for
            users who landed in-app without tapping the notification. */}
        <TrialLapsedBanner
          show={isTrialLapsed}
          userId={profileId}
          trialLapsedDaysAgo={trialLapsedDaysAgo}
          trialSource={subscription.trialSource}
        />

        {/* P4.5 — founding-tier urgency widget. Inert in dev (gated on
            !isDevMode); for non-Pro users, shows countdown until 500
            founding spots fill, then social-proof copy after. */}
        <FoundingCountdown />

        {/* P4.3 — 7-day streak Elite trigger. Sits below the founding
            widget so frequent users see the streak-specific pitch as a
            second beat after the primary urgency CTA. */}
        <EliteTriggerBanner kind="seven_streak" show={streak >= 7} />

        {/* P4.4 — coach motivation-dip banner. Routes to /coaches (the
            coach economy, NOT the Pro paywall — no PREMIUM_ENFORCED gate). */}
        <MotivationDipBanner show={!!plan && noDoneLast3Days && !hasCoach} />

        {plan?.race_date && daysToRace !== null && daysToRace >= 0 && (
          <RaceCountdown
            raceDate={plan.race_date}
            raceName={(plan as unknown as { goal?: string }).goal ?? null}
          />
        )}

        {/* Hero — full-bleed, one dominant action */}
        {heroState === 'no_plan'     && <HeroNoPlan />}
        {heroState === 'streak_risk' && <HeroStreakAtRisk streak={streak} />}
        {heroState === 'coach'       && coach && <HeroCoach coach={coach} />}
        {heroState === 'training'    && plan && (
          <HeroTraining
            sessions={todaySessions}
            planName={plan.name}
            weekN={plan.current_week}
            totalWeeks={plan.total_weeks}
            daysToRace={daysToRace}
          />
        )}
        {heroState === 'training_done' && plan && (
          <HeroTrainingDone
            planName={plan.name}
            nextSessions={nextSessions}
            streak={streak}
          />
        )}
        {heroState === 'rest'        && plan && (
          <HeroRest planName={plan.name} nextSessions={nextSessions} />
        )}

        {plan && <StatsStrip weeklyKm={weeklyKm} streak={streak} />}

        {plan && (
          <DailyQuests
            logs={allLogs}
            weeklyKm={weeklyKm}
            streak={streak}
            hasPlan={!!plan}
          />
        )}

        {squad && <SquadMini squad={squad} />}

        {/* PR X — onboarding trial-eligible CTA. Shows "+14 days Pro free"
            line on the squad/coach nudges only for users who haven't yet
            had a trial AND aren't already Pro. */}
        {(() => {
          const hasNeverHadTrial = !subscription.trialEnd && !subscription.trialEndedAt
          const showTrialUnlock  = hasNeverHadTrial && !isPro
          return (
            <>
              {!hasCoach && plan && <CoachNudge showTrialUnlock={showTrialUnlock} />}
              {!squad   && plan && <SquadNudge showTrialUnlock={showTrialUnlock} />}
            </>
          )
        })()}
        {!isPro && plan && <EliteNudge />}

      </div>

      {/* Streak-milestone share — triggered from XPHeaderBar streak chip
          when streak >= 7. Uses MilestoneShareCard server-side pipeline
          with the milestone variant + amber accent. */}
      {showStreakShare && (
        <MilestoneShareCard
          variant="milestone"
          headline={`${streak}-day streak`}
          sub={profile?.display_name as string | null ?? undefined}
          alt={`${streak}-day running streak on NextSplit. ${Math.round(weeklyKm)}km this week, ${xp} XP earned.`}
          accent="amber"
          km={weeklyKm}
          streak={streak}
          xp={xp}
          shareText={`${streak}-day streak going on NextSplit 🔥 #NextSplit`}
          onClose={() => setShowStreakShare(false)}
        />
      )}

      {/* PR K — trial welcome modal. Triggers once per (user, device) when
          isTrialing transitions to true. */}
      <TrialWelcomeModal
        show={showTrialWelcome}
        userId={profileId}
        trialDaysLeft={trialDaysLeft}
        trialSource={subscription.trialSource}
        onDismiss={() => setShowTrialWelcome(false)}
      />
    </div>
  )
}
