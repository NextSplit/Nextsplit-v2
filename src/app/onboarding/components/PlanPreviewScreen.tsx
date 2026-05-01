'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useOnboarding } from '../context/OnboardingContext'
import { createClient } from '@/lib/supabase/client'
import { db } from '@/lib/supabase/db'

interface SessionPreview {
  day: string
  type: string
  name: string
  km: number
}
interface WeekPreview {
  weekNum: number
  title: string
  sessions: SessionPreview[]
}
interface PlanSummary {
  name:        string
  totalWeeks:  number
  planType:    string
  raceDate:    string | null
  weeklyKm:    string
  gymSessions: number
  weeks:       WeekPreview[]
}

function daysUntil(dateStr: string): number {
  return Math.round((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[var(--ns-ember-light)] border border-orange-50 rounded-2xl px-4 py-3 text-center">
      <p className="text-lg font-black text-[var(--ns-ember)]">{value}</p>
      <p className="text-xs text-[var(--ns-ember)] mt-0.5">{label}</p>
    </div>
  )
}

export function PlanPreviewScreen() {
  const { data, back, setStep } = useOnboarding()
  const router   = useRouter()
  const [plan, setPlan]       = useState<PlanSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [entering, setEntering] = useState(false)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: plans } = await db(supabase)
        .from('user_plans')
        .select('name, total_weeks, plan_type, race_date, meta, weeks_data')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)

      if (plans && plans.length > 0) {
        const p = plans[0]
        // Parse first 2 weeks of sessions for preview
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const weeksRaw: any[] = Array.isArray(p.weeks_data) ? p.weeks_data.slice(0, 2) : []
        const SESSION_ICONS: Record<string, string> = {
          'run-easy': '🟢', 'run-tempo': '🟡', 'run-long': '🔵',
          'run-int': '🔴', 'run-race': '🏆', 'gym-a': '🏋️',
          'gym-b': '🏋️', 'gym-c': '🏋️', 'rest': '😴',
        }
        const weeks: WeekPreview[] = weeksRaw.map((w: any) => ({
          weekNum: w.n,
          title: w.title || `Week ${w.n}`,
          sessions: (w.days || []).flatMap((d: any) =>
            (d.sessions || []).filter((s: any) => s.km > 0 || s.c?.startsWith('gym')).map((s: any) => ({
              day: d.d,
              type: SESSION_ICONS[s.c] ?? '▶',
              name: s.n,
              km: s.km || 0,
            }))
          ),
        }))
        setPlan({
          name:        p.name,
          totalWeeks:  p.total_weeks,
          planType:    p.plan_type,
          raceDate:    p.race_date,
          weeklyKm:    `${data.weeklyKmCurrent}–${Math.round(data.weeklyKmCurrent * 1.4)}km`,
          gymSessions: data.gymEnabled ? data.gymSessionsPerWeek : 0,
          weeks,
        })
      } else {
        // No plan yet — show profile summary
        setPlan({
          name:        'Your Training',
          totalWeeks:  0,
          planType:    data.trainingPath ?? 'manual',
          raceDate:    null,
          weeklyKm:    `${data.weeklyKmCurrent}km current`,
          gymSessions: data.gymEnabled ? data.gymSessionsPerWeek : 0,
          weeks:       [],
        })
      }
      setLoading(false)
    }
    load()
  }, [data])

  const aGoal = data.goals.find(g => g.priority === 'A')

  const handleEnter = async () => {
    setEntering(true)
    // Award onboarding XP — small delay for feel
    await new Promise(r => setTimeout(r, 400))
    // Clear onboarding state from localStorage
    try {
      localStorage.removeItem('nextsplit_onboarding_data')
      localStorage.removeItem('nextsplit_onboarding_step')
    } catch { /* ignore */ }
    router.push('/home')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--color-bg)" }}>
        <div className="text-center">
          <div className="text-4xl mb-3 animate-pulse">📋</div>
          <p className="text-sm text-[var(--color-text-tertiary)]">Loading your plan…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--color-bg)" }} style={{ background: "var(--color-bg)" }}>
      {/* Header */}
      <div className="bg-gradient-to-b from-[#0f172a] to-[#0d3d38] px-6 pt-12 pb-8 text-center">
        <div className="text-4xl mb-3">🎉</div>
        <h1 className="text-2xl font-black text-white">Your plan is ready</h1>
        <p className="text-[var(--ns-cyan-light)] text-sm mt-1">
          Welcome to NextSplit, @{data.handle}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto pb-36 px-4 pt-6 space-y-4">

        {/* Plan header card */}
        {plan && (
          <div className="rounded-2xl p-5 space-y-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-tertiary)' }}>Your plan</p>
                <h2 className="text-lg font-black" style={{ color: 'var(--color-text-primary)' }}>{plan.name}</h2>
                <div className="flex items-center gap-3 mt-1">
                  {plan.totalWeeks > 0 && (
                    <span className="text-xs font-bold" style={{ color: 'var(--ns-ember)' }}>{plan.totalWeeks} weeks</span>
                  )}
      
            {/* Race date alignment warning */}
            {plan.raceDate && plan.totalWeeks > 0 && (() => {
              const raceDays = Math.ceil((new Date(plan.raceDate).getTime() - Date.now()) / 86400000)
              const planDays = plan.totalWeeks * 7
              const gap = Math.abs(raceDays - planDays)
              if (gap > 21) {
                return (
                  <div className="rounded-xl px-4 py-3 flex gap-3 items-start"
                    style={{ background: 'rgba(240,165,0,0.12)', border: '1px solid rgba(240,165,0,0.35)' }}>
                    <span className="text-lg flex-shrink-0">⚠️</span>
                    <div>
                      <p className="text-sm font-black" style={{ color: '#f0a500' }}>
                        Plan timing heads-up
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                        Your race is in {raceDays} days but this plan is {planDays} days long.
                        {raceDays < planDays ? " We've started from the most relevant week for your timeline." : " You'll finish the plan with time to taper."}
                      </p>
                    </div>
                  </div>
                )
              }
              return null
            })()}

            {aGoal?.race_date && (
                    <span className="text-xs font-bold" style={{ color: 'var(--ns-track)' }}>Race in {daysUntil(aGoal.race_date)} days</span>
                  )}
                </div>
              </div>
              <div className="text-3xl">
                {{ predetermined: '📋', ai_bespoke: '🤖', manual: '✏️', lifestyle: '🌿', coach_marketplace: '👥' }[plan.planType] ?? '📋'}
              </div>
            </div>
          </div>
        )}

        {/* Week-by-week session preview */}
        {plan && plan.weeks.length > 0 && plan.weeks.map(week => (
          <div key={week.weekNum} className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <div className="flex items-center justify-between">
              <p className="text-xs font-black uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>
                Week {week.weekNum} — {week.title}
              </p>
              {week.weekNum === 1 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: 'var(--ns-ember)' }}>Starts today</span>
              )}
            </div>
            <div className="space-y-2">
              {week.sessions.map((s, si) => (
                <div key={si} className="flex items-center gap-3 py-2 px-3 rounded-xl" style={{ background: 'var(--color-surface-2)' }}>
                  <span className="text-base w-6 text-center">{s.type}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate" style={{ color: 'var(--color-text-primary)' }}>{s.name}</p>
                    <p className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>{s.day}</p>
                  </div>
                  {s.km > 0 && (
                    <span className="text-xs font-black font-data flex-shrink-0" style={{ color: 'var(--ns-ember)' }}>{s.km}km</span>
                  )}
                </div>
              ))}
              {week.sessions.length === 0 && (
                <p className="text-xs text-center py-2" style={{ color: 'var(--color-text-tertiary)' }}>Rest week</p>
              )}
            </div>
          </div>
        ))}

        {/* A Goal reminder */}
        {aGoal && (
          <div className="rounded-2xl p-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--color-text-tertiary)' }}>Your A goal</p>
            <div className="flex items-center gap-3">
              <span className="text-2xl">🎯</span>
              <div>
                <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
                  {aGoal.race_name ?? aGoal.race_distance_label ?? aGoal.goal_type?.replace(/_/g, ' ')}
                </p>
                {aGoal.race_date && (
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
                    {new Date(aGoal.race_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                )}
                {aGoal.target_time_secs && (
                  <p className="text-xs font-semibold mt-0.5" style={{ color: 'var(--ns-ember)' }}>
                    Target: {Math.floor(aGoal.target_time_secs / 3600)}h {String(Math.floor((aGoal.target_time_secs % 3600) / 60)).padStart(2,'0')}m
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* XP unlock */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-400 rounded-2xl p-4 text-white">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚡</span>
            <div>
              <p className="text-sm font-black">+150 XP — Onboarding complete!</p>
              <p className="text-xs text-orange-50 mt-0.5">Your character is ready and waiting</p>
            </div>
          </div>
        </div>

        {/* Adapt section — paywall reveal moment (Product Pillar spec) */}
        <div className="rounded-2xl border-2 overflow-hidden"
          style={{ borderColor: 'var(--ns-ember)' }}>
          {/* Header — always visible */}
          <div className="px-4 py-3 flex items-center gap-2"
            style={{ background: 'var(--ns-ember)', color: 'white' }}>
            <span className="text-base">🧠</span>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider opacity-70">NextSplit Pro</p>
              <p className="text-sm font-bold">Plan adaptation</p>
            </div>
          </div>

          {/* Preview — blurred for free users */}
          <div className="relative ">
            <div className="px-4 py-4 space-y-2" style={{ filter: 'blur(3px)', userSelect: 'none' }}>
              <div className="flex items-start gap-2 text-xs text-[var(--color-text-secondary)]">
                <span>↩️</span>
                <span>Missed session detected — plan rebuilt around what actually happened</span>
              </div>
              <div className="flex items-start gap-2 text-xs text-[var(--color-text-secondary)]">
                <span>⚠️</span>
                <span>ACWR at 1.4 — Thursday intervals moved to protect recovery</span>
              </div>
              <div className="flex items-start gap-2 text-xs text-[var(--color-text-secondary)]">
                <span>📅</span>
                <span>4 weeks to race — taper begins next Monday</span>
              </div>
            </div>

            {/* Unlock overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center"
              style={{ background: 'rgba(255,255,255,0.85)' }}>
              <p className="text-sm font-bold text-[var(--color-text-primary)] mb-1">
                Your plan adapts around real life
              </p>
              <p className="text-xs text-[var(--color-text-tertiary)] mb-3 leading-relaxed">
                Miss a session, get ill, change your race date — the plan rebuilds itself. This is what keeps runners training.
              </p>
              <a href="/profile?upgrade=1"
                className="inline-block text-white text-xs font-bold px-4 py-2 rounded-xl"
                style={{ background: 'var(--ns-ember)' }}>
                Unlock with Pro — £4.99/mo →
              </a>
              <p className="text-[10px] text-[var(--color-text-tertiary)] mt-2">Cancel any time. Free plan continues working without this.</p>
            </div>
          </div>
        </div>

        {/* Adjust option */}
        <div className="text-center">
          <button
            onClick={() => setStep(10)}
            className="text-sm text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] transition-colors underline"
          >
            Something not right? Go back and adjust
          </button>
        </div>

        {/* What happens next */}
        <div className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>What happens next</p>
          {[
            { emoji: '📅', text: 'Your Today tab shows today\'s sessions — no setup needed' },
            { emoji: '📊', text: 'Log runs and gym sessions to earn XP and level up' },
            { emoji: '🌅', text: 'Your runner class reveals after 4 weeks of training data' },
            { emoji: '🏆', text: 'Hit milestones to unlock character cosmetics and badges' },
          ].map(item => (
            <div key={item.text} className="flex items-start gap-3 text-xs text-[var(--color-text-secondary)]">
              <span>{item.emoji}</span>
              <span>{item.text}</span>
            </div>
          ))}
        </div>

      </div>

      {/* Enter app CTA */}
      <div className="fixed bottom-0 left-0 right-0  border-t border-[var(--color-border)] px-4 py-4">
        <button
          onClick={handleEnter}
          disabled={entering}
          className="w-full text-white py-4 rounded-2xl text-base font-black tracking-tight transition-all active:scale-95 disabled:opacity-70"
          style={{ background: 'var(--ns-ember)' }}
        >
          {entering ? 'Let\'s go…' : 'Start training →'}
        </button>
      </div>
    </div>
  )
}
