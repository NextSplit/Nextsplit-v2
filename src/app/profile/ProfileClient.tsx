'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useSupabase } from '@/hooks/useSupabase'
import { useActivePlan } from '@/hooks/useActivePlan'
import { useTrainingLog } from '@/hooks/useTrainingLog'
import { useProfile } from '@/hooks/useProfile'
import { signout } from '@/app/auth/actions'
import {
  getLevelForXP, getXPProgress, getSessionXP, BADGES, checkBadges,
  type BadgeStats
} from '@/lib/xp'
import type { TrainingLog } from '@/types/database'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeXP(logs: Record<string, TrainingLog>, planWeeks: import('@/types/database').PlanWeek[]): number {
  let total = 0
  for (const log of Object.values(logs)) {
    if (!log.done) continue
    // Find session type from plan
    const week = planWeeks.find(w => w.n === log.week_n)
    const session = week?.days[log.day_i]?.sessions[log.session_i]
    total += session ? getSessionXP(session.c) : 10
  }
  return total
}

function computeBadgeStats(
  logs: Record<string, TrainingLog>,
  planWeeks: import('@/types/database').PlanWeek[],
  xp: number
): BadgeStats {
  const all = Object.values(logs).filter(l => l.done)
  const totalKm = all.reduce((a, l) => a + (l.km ?? 0), 0)
  const longestRun = Math.max(0, ...all.map(l => l.km ?? 0))

  const gymCodes = new Set(['gym-a','gym-b','gym-c','gym-bw'])
  const totalGym = all.filter(l => {
    const week = planWeeks.find(w => w.n === l.week_n)
    const s = week?.days[l.day_i]?.sessions[l.session_i]
    return s && gymCodes.has(s.c)
  }).length

  const raceCodes = new Set(['run-race'])
  const racesCompleted = all.filter(l => {
    const week = planWeeks.find(w => w.n === l.week_n)
    const s = week?.days[l.day_i]?.sessions[l.session_i]
    return s && raceCodes.has(s.c)
  }).length

  // Check if any week is fully complete
  const weekCompleted = planWeeks.some(week => {
    const planned = week.days.reduce((a, d) => a + d.sessions.length, 0)
    if (planned === 0) return false
    const done = week.days.reduce((acc, day, dayI) =>
      acc + day.sessions.filter((_, sessI) => logs[`${week.n}_${dayI}_${sessI}`]?.done).length, 0)
    return done >= planned
  })

  return {
    totalSessions: all.length,
    totalKm,
    totalRuns: all.length - totalGym,
    totalGym,
    longestRun,
    consecutiveDays: 0,
    racesCompleted,
    firstSession: all.length > 0,
    weekCompleted,
    xp,
  }
}

// ─── XP Bar component ─────────────────────────────────────────────────────────

function XPBar({ xp }: { xp: number }) {
  const level = getLevelForXP(xp)
  const progress = getXPProgress(xp)
  const nextLevel = level.level < 15 ? level.maxXP : null
  const xpToNext = nextLevel ? nextLevel - xp : null

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-xs text-gray-400 mb-0.5">Level {level.level}</div>
          <div className="text-base font-bold text-gray-900">{level.name}</div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-black text-[#0D9488]">{xp.toLocaleString()}</div>
          <div className="text-[10px] text-gray-400">XP total</div>
        </div>
      </div>

      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden mb-1.5">
        <div
          className="h-full bg-gradient-to-r from-[#0D9488] to-[#0891B2] rounded-full transition-all duration-700"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex justify-between text-[10px] text-gray-400">
        <span>Level {level.level}</span>
        {xpToNext && <span>{xpToNext.toLocaleString()} XP to Level {level.level + 1}</span>}
        {!xpToNext && <span>🏆 Max level</span>}
      </div>
    </div>
  )
}

// ─── Badge grid ───────────────────────────────────────────────────────────────

function BadgeGrid({ earned }: { earned: Set<string> }) {
  const [showAll, setShowAll] = useState(false)
  const earnedBadges = BADGES.filter(b => earned.has(b.id))
  const lockedBadges = BADGES.filter(b => !earned.has(b.id))
  const visible = showAll ? lockedBadges : lockedBadges.slice(0, 6)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-baseline justify-between mb-4">
        <div className="text-sm font-bold text-gray-900">Badges</div>
        <div className="text-xs text-gray-400">{earnedBadges.length}/{BADGES.length} earned</div>
      </div>

      {earnedBadges.length === 0 && (
        <p className="text-xs text-gray-400 mb-4">Log sessions to earn badges.</p>
      )}

      {/* Earned */}
      {earnedBadges.length > 0 && (
        <div className="mb-4">
          <div className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wide mb-2">Earned</div>
          <div className="grid grid-cols-4 gap-2">
            {earnedBadges.map(badge => (
              <div key={badge.id} className="flex flex-col items-center gap-1">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-2xl">
                  {badge.emoji}
                </div>
                <span className="text-[9px] text-center text-emerald-700 font-medium leading-tight px-0.5">
                  {badge.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Locked */}
      <div>
        <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Locked</div>
        <div className="grid grid-cols-4 gap-2">
          {visible.map(badge => (
            <div key={badge.id} className="flex flex-col items-center gap-1">
              <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center text-2xl opacity-30 grayscale">
                {badge.emoji}
              </div>
              <span className="text-[9px] text-center text-gray-400 leading-tight px-0.5">
                {badge.name}
              </span>
            </div>
          ))}
        </div>
        {lockedBadges.length > 6 && (
          <button
            onClick={() => setShowAll(s => !s)}
            className="mt-3 text-[11px] text-[#0D9488] font-semibold"
          >
            {showAll ? 'Show less' : `+${lockedBadges.length - 6} more locked`}
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Strava section ───────────────────────────────────────────────────────────

function StravaSection({ clientId, isConnected }: { clientId: string | null; isConnected: boolean }) {
  const [saving, setSaving] = useState(false)
  const [inputId, setInputId] = useState(clientId ?? '')
  const [saved, setSaved] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://nextsplit-v2.vercel.app'
  const redirectUri = `${siteUrl}/auth/strava/callback`

  function handleConnect() {
    if (!inputId) return
    localStorage.setItem('strava_client_id', inputId)
    const url = `https://www.strava.com/oauth/authorize?client_id=${inputId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=activity:read_all`
    window.location.href = url
  }

  async function handleDisconnect() {
    setDisconnecting(true)
    try {
      await fetch('/api/strava/disconnect', { method: 'POST' })
      window.location.reload()
    } finally {
      setDisconnecting(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center flex-shrink-0">
          <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6">
            <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
          </svg>
        </div>
        <div className="flex-1">
          <div className="text-sm font-bold text-gray-900">Strava</div>
          <div className="text-xs text-gray-400">
            {isConnected ? '✅ Connected — sync runs after each session' : 'Connect to auto-import activities'}
          </div>
        </div>
      </div>

      {isConnected ? (
        <button
          onClick={handleDisconnect}
          disabled={disconnecting}
          className="w-full py-2.5 rounded-xl border border-red-200 text-red-500 text-xs font-semibold disabled:opacity-40"
        >
          {disconnecting ? 'Disconnecting…' : 'Disconnect Strava'}
        </button>
      ) : (
        <>
          <div className="mb-3">
            <label className="text-xs font-semibold text-gray-600 block mb-1.5">Your Strava Client ID</label>
            <div className="flex gap-2">
              <input
                type="text" value={inputId}
                onChange={e => setInputId(e.target.value)}
                placeholder="e.g. 226724"
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
              />
              <button
                onClick={() => { localStorage.setItem('strava_client_id', inputId); setSaved(true); setTimeout(() => setSaved(false), 2000) }}
                disabled={saving || !inputId}
                className="px-3 py-2 rounded-xl bg-gray-100 text-xs font-semibold text-gray-600 disabled:opacity-40"
              >
                {saved ? '✓' : 'Save'}
              </button>
            </div>
            <p className="text-[10px] text-gray-400 mt-1.5">Found at strava.com/settings/api</p>
          </div>
          <button
            onClick={handleConnect}
            disabled={!inputId}
            className="w-full py-3 rounded-xl bg-orange-500 text-white text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-2"
          >
            <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4">
              <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
            </svg>
            Connect with Strava
          </button>
          <p className="text-[10px] text-gray-400 text-center mt-2">
            Requires STRAVA_CLIENT_SECRET in Vercel env vars
          </p>
        </>
      )}
    </div>
  )
}

// ─── Training summary ─────────────────────────────────────────────────────────

function TrainingSummary({ logs }: { logs: Record<string, TrainingLog> }) {
  const all = Object.values(logs).filter(l => l.done)
  const totalKm = all.reduce((a, l) => a + (l.km ?? 0), 0)
  const avgEffort = all.filter(l => l.effort).length > 0
    ? (all.filter(l => l.effort).reduce((a, l) => a + l.effort!, 0) / all.filter(l => l.effort).length).toFixed(1)
    : '—'

  return (
    <div className="grid grid-cols-3 gap-3">
      {[
        { label: 'Sessions', value: all.length, unit: '' },
        { label: 'km logged', value: Math.round(totalKm), unit: 'km' },
        { label: 'Avg RPE', value: avgEffort, unit: '/10' },
      ].map(stat => (
        <div key={stat.label} className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
          <div className="text-xl font-black text-gray-900">
            {stat.value}<span className="text-xs font-normal text-gray-400">{stat.unit}</span>
          </div>
          <div className="text-[10px] text-gray-400 mt-0.5">{stat.label}</div>
        </div>
      ))}
    </div>
  )
}

// ─── Athlete profile settings ─────────────────────────────────────────────────

function AthleteProfileSection() {
  const { profile, loading, updateProfile } = useProfile()
  const [editing, setEditing] = useState(false)
  const [weight, setWeight] = useState('')
  const [age, setAge] = useState('')
  const [experience, setExperience] = useState<'beginner'|'intermediate'|'advanced'|''>('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (profile) {
      setWeight(profile.weight_kg != null ? String(profile.weight_kg) : '')
      setAge(profile.age != null ? String(profile.age) : '')
      setExperience(profile.experience ?? '')
    }
  }, [profile])

  async function handleSave() {
    setSaving(true)
    try {
      await updateProfile({
        weight_kg: weight ? Number(weight) : null,
        age: age ? Number(age) : null,
        experience: experience || null,
      })
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return null

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm font-bold text-gray-900">Athlete profile</div>
        {!editing && (
          <button onClick={() => setEditing(true)}
            className="text-xs font-semibold text-[#0D9488]">Edit</button>
        )}
      </div>

      {!editing ? (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Weight', value: profile?.weight_kg ? `${profile.weight_kg}kg` : '—' },
            { label: 'Age', value: profile?.age ? `${profile.age}y` : '—' },
            { label: 'Level', value: profile?.experience ? profile.experience.charAt(0).toUpperCase() + profile.experience.slice(1) : '—' },
          ].map(s => (
            <div key={s.label} className="bg-gray-50 rounded-xl p-3 text-center">
              <div className="text-sm font-bold text-gray-900">{s.value}</div>
              <div className="text-[10px] text-gray-400 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Weight (kg)</label>
              <input type="number" value={weight} onChange={e => setWeight(e.target.value)}
                placeholder="e.g. 70"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D9488]" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Age</label>
              <input type="number" value={age} onChange={e => setAge(e.target.value)}
                placeholder="e.g. 32"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D9488]" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Experience level</label>
            <div className="flex gap-2">
              {(['beginner','intermediate','advanced'] as const).map(l => (
                <button key={l} onClick={() => setExperience(l)}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                    experience === l ? 'bg-[#0D9488] text-white border-transparent' : 'bg-white text-gray-500 border-gray-200'
                  }`}>
                  {l.charAt(0).toUpperCase() + l.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={() => setEditing(false)}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-[#0D9488] text-white text-xs font-semibold disabled:opacity-50">
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ProfileClient({ email, displayName: initialDisplayName, isStravaConnected }: { email: string; displayName: string; isStravaConnected: boolean }) {
  const router = useRouter()
  const supabase = useSupabase()
  const { plan, weeks } = useActivePlan()
  const { logs } = useTrainingLog(plan?.id ?? null)
  const [stravaClientId, setStravaClientId] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState(initialDisplayName)
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState(initialDisplayName)
  const [savingName, setSavingName] = useState(false)

  useEffect(() => {
    setStravaClientId(localStorage.getItem('strava_client_id'))
  }, [])

  async function saveDisplayName() {
    if (!nameInput.trim()) return
    setSavingName(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await (supabase as any).from('profiles').upsert({ id: user.id, display_name: nameInput.trim() })
        setDisplayName(nameInput.trim())
        router.refresh()
      }
    } finally {
      setSavingName(false)
      setEditingName(false)
    }
  }

  const xp = useMemo(() => computeXP(logs, weeks), [logs, weeks])
  const badgeStats = useMemo(() => computeBadgeStats(logs, weeks, xp), [logs, weeks, xp])
  const earnedBadgeIds = useMemo(() => new Set(checkBadges(badgeStats)), [badgeStats])
  const level = getLevelForXP(xp)

  return (
    <div className="min-h-screen bg-[#f8f8f6] pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-5">
        <div className="max-w-lg mx-auto flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#0D9488] to-[#0891B2] flex items-center justify-center text-2xl text-white font-black">
            {displayName[0].toUpperCase()}
          </div>
          <div className="flex-1">
            {editingName ? (
              <div className="flex items-center gap-2 mb-1">
                <input value={nameInput} onChange={e => setNameInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveDisplayName(); if (e.key === 'Escape') setEditingName(false) }}
                  autoFocus
                  className="flex-1 border border-gray-200 rounded-lg px-2 py-1 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#0D9488]" />
                <button onClick={saveDisplayName} disabled={savingName}
                  className="text-xs font-semibold text-[#0D9488] disabled:opacity-50">
                  {savingName ? '…' : 'Save'}
                </button>
                <button onClick={() => setEditingName(false)} className="text-xs text-gray-400">✕</button>
              </div>
            ) : (
              <button onClick={() => { setNameInput(displayName); setEditingName(true) }}
                className="flex items-center gap-1.5 group mb-0.5">
                <span className="text-base font-bold text-gray-900">{displayName}</span>
                <svg className="w-3 h-3 text-gray-300 group-hover:text-[#0D9488] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            )}
            <div className="text-xs text-gray-400">{email}</div>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-xs font-semibold text-[#0D9488]">Lv {level.level}</span>
              <span className="text-[10px] text-gray-400">·</span>
              <span className="text-xs text-gray-500">{level.name}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">

        {/* XP bar */}
        <XPBar xp={xp} />

        {/* Training summary */}
        <TrainingSummary logs={logs} />

        {/* Badges */}
        <BadgeGrid earned={earnedBadgeIds} />

        {/* Active plan + change */}
        {plan && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-1">
              <div className="text-sm font-bold text-gray-900">Active Plan</div>
              <a
                href="/onboarding"
                className="text-xs font-semibold text-[#0D9488] bg-teal-50 px-3 py-1.5 rounded-full"
              >
                Change plan
              </a>
            </div>
            <div className="text-sm text-gray-600 font-medium">{plan.name}</div>
            <div className="text-xs text-gray-400 mt-0.5">
              Week {plan.current_week} of {plan.total_weeks}
              {plan.race_date && ` · Race: ${new Date(plan.race_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`}
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mt-3">
              <div
                className="h-full bg-[#0D9488] rounded-full"
                style={{ width: `${Math.round((plan.current_week / plan.total_weeks) * 100)}%` }}
              />
            </div>
            <p className="text-[10px] text-amber-600 mt-2.5 bg-amber-50 rounded-lg px-2.5 py-1.5">
              ⚠️ Switching plans archives your current plan. Your logs are kept.
            </p>
          </div>
        )}

        {!plan && (
          <a
            href="/onboarding"
            className="block bg-white rounded-2xl border border-dashed border-gray-200 p-5 text-center"
          >
            <div className="text-2xl mb-1">📋</div>
            <div className="text-sm font-semibold text-gray-900">No active plan</div>
            <div className="text-xs text-[#0D9488] mt-1 font-medium">Choose a plan →</div>
          </a>
        )}

        {/* Strava */}
        <StravaSection clientId={stravaClientId} isConnected={isStravaConnected} />

        {/* Athlete profile */}
        <AthleteProfileSection />

        {/* Sign out */}
        <form action={signout} onSubmit={() => {
          // Clear user-specific localStorage data on signout
          localStorage.removeItem('nextsplit_wellness')
          localStorage.removeItem('strava_client_id')
          // Clear hydration data (all dates)
          Object.keys(localStorage).filter(k => k.startsWith('hydration_')).forEach(k => localStorage.removeItem(k))
        }}>
          <button
            type="submit"
            className="w-full py-3 rounded-2xl border border-red-200 text-red-500 text-sm font-semibold bg-white"
          >
            Sign out
          </button>
        </form>

      </div>
    </div>
  )
}
