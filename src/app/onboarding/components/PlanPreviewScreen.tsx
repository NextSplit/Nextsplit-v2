'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useOnboarding } from '../context/OnboardingContext'
import { createClient } from '@/lib/supabase/client'
import { db } from '@/lib/supabase/db'

interface PlanSummary {
  name:        string
  totalWeeks:  number
  planType:    string
  raceDate:    string | null
  weeklyKm:    string
  gymSessions: number
}

function daysUntil(dateStr: string): number {
  return Math.round((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-teal-50 border border-teal-100 rounded-2xl px-4 py-3 text-center">
      <p className="text-lg font-black text-teal-700">{value}</p>
      <p className="text-xs text-teal-500 mt-0.5">{label}</p>
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
        .select('name, total_weeks, plan_type, race_date, meta')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)

      if (plans && plans.length > 0) {
        const p = plans[0]
        setPlan({
          name:        p.name,
          totalWeeks:  p.total_weeks,
          planType:    p.plan_type,
          raceDate:    p.race_date,
          weeklyKm:    `${data.weeklyKmCurrent}–${Math.round(data.weeklyKmCurrent * 1.4)}km`,
          gymSessions: data.gymEnabled ? data.gymSessionsPerWeek : 0,
        })
      } else {
        // Manual / marketplace path — show profile summary instead
        setPlan({
          name:        'Your Training',
          totalWeeks:  0,
          planType:    data.trainingPath ?? 'manual',
          raceDate:    null,
          weeklyKm:    `${data.weeklyKmCurrent}km current`,
          gymSessions: data.gymEnabled ? data.gymSessionsPerWeek : 0,
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
    router.push('/today')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3 animate-pulse">📋</div>
          <p className="text-sm text-slate-400">Loading your plan…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-b from-[#0f172a] to-[#0d3d38] px-6 pt-12 pb-8 text-center">
        <div className="text-4xl mb-3">🎉</div>
        <h1 className="text-2xl font-black text-white">Your plan is ready</h1>
        <p className="text-teal-300 text-sm mt-1">
          Welcome to NextSplit, @{data.handle}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto pb-36 px-4 pt-6 space-y-4">

        {/* Plan card */}
        {plan && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Your plan</p>
                <h2 className="text-lg font-black text-slate-900">{plan.name}</h2>
                <p className="text-xs text-slate-400 mt-0.5 capitalize">
                  {plan.planType.replace('_', ' ')} plan
                </p>
              </div>
              <div className="text-3xl">
                {{ predetermined: '📋', ai_bespoke: '🤖', manual: '✏️', lifestyle: '🌿', coach_marketplace: '👥' }[plan.planType] ?? '📋'}
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3">
              {plan.totalWeeks > 0 && (
                <StatPill label="Weeks" value={`${plan.totalWeeks}w`} />
              )}
              <StatPill label="Current load" value={plan.weeklyKm} />
              {plan.gymSessions > 0 && (
                <StatPill label="Gym / week" value={`${plan.gymSessions}x`} />
              )}
              {aGoal?.race_date && (
                <StatPill label="Race in" value={`${daysUntil(aGoal.race_date)}d`} />
              )}
            </div>
          </div>
        )}

        {/* Goal reminder */}
        {aGoal && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Your A goal</p>
            <div className="flex items-center gap-3">
              <span className="text-2xl">🎯</span>
              <div>
                <p className="text-sm font-bold text-slate-800">
                  {aGoal.race_name ?? aGoal.race_distance_label ?? aGoal.goal_type?.replace('_', ' ')}
                </p>
                {aGoal.race_date && (
                  <p className="text-xs text-slate-400 mt-0.5">
                    {new Date(aGoal.race_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                )}
                {aGoal.target_time_secs && (
                  <p className="text-xs text-teal-600 font-semibold mt-0.5">
                    Target: {Math.floor(aGoal.target_time_secs / 3600)}:{String(Math.floor((aGoal.target_time_secs % 3600) / 60)).padStart(2, '0')}:{String(aGoal.target_time_secs % 60).padStart(2, '0')}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* XP unlock */}
        <div className="bg-gradient-to-r from-teal-500 to-teal-400 rounded-2xl p-4 text-white">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚡</span>
            <div>
              <p className="text-sm font-black">+150 XP — Onboarding complete!</p>
              <p className="text-xs text-teal-100 mt-0.5">Your character is ready and waiting</p>
            </div>
          </div>
        </div>

        {/* Adjust option */}
        <div className="text-center">
          <button
            onClick={() => setStep(10)}
            className="text-sm text-slate-400 hover:text-slate-600 transition-colors underline"
          >
            Something not right? Go back and adjust
          </button>
        </div>

        {/* What happens next */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">What happens next</p>
          {[
            { emoji: '📅', text: 'Your Today tab shows today\'s sessions' },
            { emoji: '📊', text: 'Log runs and gym sessions to earn XP' },
            { emoji: '🤖', text: 'Your AI coach gives feedback as you train' },
            { emoji: '🏆', text: 'Hit milestones to unlock badges and level up' },
          ].map(item => (
            <div key={item.text} className="flex items-start gap-3 text-xs text-slate-600">
              <span>{item.emoji}</span>
              <span>{item.text}</span>
            </div>
          ))}
        </div>

      </div>

      {/* Enter app CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-4 py-4">
        <button
          onClick={handleEnter}
          disabled={entering}
          className="w-full bg-teal-500 text-white py-4 rounded-2xl text-base font-black tracking-tight hover:bg-teal-600 transition-all active:scale-95 disabled:opacity-70"
        >
          {entering ? 'Let\'s go…' : 'Start training →'}
        </button>
      </div>
    </div>
  )
}
