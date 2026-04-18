'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useSupabase } from '@/hooks/useSupabase'
import { useActivePlan } from '@/hooks/useActivePlan'
import { useTrainingLog } from '@/hooks/useTrainingLog'
import { useProfile } from '@/hooks/useProfile'
import { signout } from '@/app/auth/actions'
import { computePersonalBests } from '@/lib/personalBests'
import { computeStreak, computeConsistency } from '@/lib/streak'
import {
  RPG_CHARS, RPG_BADGES, RARITY_CONFIG,
  computeRPGStats, getLevelForXP, getXPProgress, getXPToNext,
  checkNewBadges, renderCharSVG,
  type RPGStats, type RPGBadge,
} from '@/lib/rpg'
import type { TrainingLog } from '@/types/database'

const RACE_DISTANCES = [
  { label: '5K', km: 5 },
  { label: '10K', km: 10 },
  { label: 'Half', km: 21.0975 },
  { label: 'Marathon', km: 42.195 },
]

// ─── Character Select Modal ───────────────────────────────────────────────────

function CharSelectModal({
  currentCharId, onSelect, onClose
}: {
  currentCharId: string
  onSelect: (id: string) => void
  onClose: () => void
}) {
  const [selected, setSelected] = useState(currentCharId)

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="w-full max-w-lg mx-auto bg-white rounded-t-3xl shadow-2xl"
        onClick={e => e.stopPropagation()}>
        <div className="p-6">
          <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
          <h2 className="text-lg font-black text-gray-900 mb-1">Choose your runner</h2>
          <p className="text-xs text-gray-400 mb-5">Your character evolves as you level up</p>
          <div className="grid grid-cols-3 gap-3 mb-5">
            {RPG_CHARS.map(ch => {
              const isSel = selected === ch.id
              return (
                <button key={ch.id}
                  onClick={() => setSelected(ch.id)}
                  className={`rounded-2xl border-2 p-3 text-center transition-all ${isSel ? 'border-[#0D9488] bg-teal-50 shadow-md' : 'border-gray-100 bg-white'}`}
                >
                  <div dangerouslySetInnerHTML={{ __html: renderCharSVG(ch.id, 5, 70, 90) }} />
                  <div className={`text-xs font-bold mt-1 ${isSel ? 'text-[#0D9488]' : 'text-gray-700'}`}>{ch.label}</div>
                  <div className="text-[9px] text-gray-400 mt-0.5">{ch.specialty}</div>
                </button>
              )
            })}
          </div>
          <div className="flex gap-3">
            <button onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600">
              Cancel
            </button>
            <button onClick={() => { onSelect(selected); onClose() }}
              className="flex-2 flex-1 py-3 rounded-xl bg-[#0D9488] text-white text-sm font-bold">
              Select character
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Badge Unlock Toast ───────────────────────────────────────────────────────

function BadgeToast({ badge, onDismiss }: { badge: RPGBadge; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000)
    return () => clearTimeout(t)
  }, [onDismiss])

  const rarity = RARITY_CONFIG[badge.rarity]

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 animate-bounce-once">
      <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl border ${rarity.border} bg-white max-w-xs`}>
        <div className="text-3xl">{badge.emoji}</div>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Badge unlocked!</div>
          <div className="text-sm font-black text-gray-900">{badge.name}</div>
          <div className="text-[10px] text-gray-500">{badge.desc}</div>
        </div>
        <div className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full ${rarity.colour}`}>
          {rarity.label}
        </div>
      </div>
    </div>
  )
}

// ─── Stat Bar ─────────────────────────────────────────────────────────────────

function StatBar({ label, value, colour }: { label: string; value: number; colour: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-gray-400 w-16 flex-shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${colour}`}
          style={{ width: `${value}%` }} />
      </div>
      <span className={`text-[10px] font-black w-6 text-right ${colour.replace('bg-', 'text-')}`}>{value}</span>
    </div>
  )
}

// ─── Badge Grid ───────────────────────────────────────────────────────────────

function BadgeGrid({ unlockedIds }: { unlockedIds: Set<string> }) {
  const [filter, setFilter] = useState<string>('all')
  const cats = ['all', 'distance', 'compliance', 'strength', 'recovery', 'nutrition', 'performance', 'special']

  const shown = filter === 'all' ? RPG_BADGES : RPG_BADGES.filter(b => b.cat === filter)
  const sorted = [...shown].sort((a, b) => {
    const au = unlockedIds.has(a.id) ? 0 : 1
    const bu = unlockedIds.has(b.id) ? 0 : 1
    return au - bu
  })

  return (
    <div>
      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-3 scrollbar-hide">
        {cats.map(c => (
          <button key={c} onClick={() => setFilter(c)}
            className={`flex-shrink-0 px-3 py-1 rounded-full text-[10px] font-bold capitalize transition-all ${filter === c ? 'bg-[#0D9488] text-white' : 'bg-gray-100 text-gray-500'}`}>
            {c}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-4 gap-2">
        {sorted.map(b => {
          const unlocked = unlockedIds.has(b.id)
          const rarity = RARITY_CONFIG[b.rarity]
          return (
            <div key={b.id} title={unlocked ? `${b.name}: ${b.desc}` : `Locked: ${b.desc}`}
              className={`rounded-xl border-2 p-2 text-center transition-all ${unlocked ? `${rarity.border} bg-white ${rarity.glow}` : 'border-gray-100 bg-gray-50 opacity-30 grayscale'}`}>
              <div className="text-xl mb-0.5">{b.emoji}</div>
              <div className={`text-[8px] font-bold leading-tight ${unlocked ? 'text-gray-800' : 'text-gray-400'}`}>
                {b.name}
              </div>
              {unlocked && (
                <div className={`text-[7px] font-bold mt-0.5 ${rarity.colour.split(' ')[1]}`}>
                  {rarity.label}
                </div>
              )}
            </div>
          )
        })}
      </div>
      <p className="text-[10px] text-gray-400 text-center mt-3">
        {unlockedIds.size} / {RPG_BADGES.length} unlocked
      </p>
    </div>
  )
}

// ─── Hero Card (character + XP + level) ──────────────────────────────────────

function HeroCard({
  charId, stats, displayName, onEditChar
}: {
  charId: string
  stats: RPGStats
  displayName: string
  onEditChar: () => void
}) {
  const progress = getXPProgress(stats.xp)
  const toNext = getXPToNext(stats.xp)
  const ch = RPG_CHARS.find(c => c.id === charId) ?? RPG_CHARS[0]

  return (
    <div className="rounded-3xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0f3460 100%)' }}>
      <div className="p-5">
        <div className="flex items-start gap-4 mb-4">
          {/* Character avatar */}
          <div className="relative flex-shrink-0">
            <button onClick={onEditChar}
              className="block" title="Change character">
              <div dangerouslySetInnerHTML={{ __html: renderCharSVG(charId, stats.level.level, 88, 108) }} />
            </button>
            {/* Level badge */}
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-[#0D9488] text-white text-[10px] font-black px-2 py-0.5 rounded-full whitespace-nowrap shadow-lg">
              Lv.{stats.level.level}
            </div>
            {/* Edit hint */}
            <button onClick={onEditChar}
              className="absolute -top-1 -right-1 w-5 h-5 bg-white rounded-full border border-gray-200 flex items-center justify-center text-[10px] text-gray-500 shadow">
              ✎
            </button>
          </div>

          {/* Name + level + XP */}
          <div className="flex-1 min-w-0 pt-1">
            <div className="text-white font-black text-lg leading-tight">{displayName}</div>
            <div className="text-teal-300 text-xs font-semibold mt-0.5">{stats.level.name}</div>
            <div className="text-gray-400 text-[10px] mt-0.5">{ch.specialty}</div>

            {/* XP bar */}
            <div className="mt-3">
              <div className="flex justify-between text-[9px] mb-1">
                <span className="text-gray-400">{stats.xp.toLocaleString()} XP</span>
                {stats.level.level < 15 && (
                  <span className="text-gray-400">{toNext} to Lv.{stats.level.level + 1}</span>
                )}
              </div>
              <div className="h-2.5 bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-1000"
                  style={{
                    width: `${progress}%`,
                    background: 'linear-gradient(90deg, #0D9488, #818cf8)'
                  }} />
              </div>
            </div>
          </div>
        </div>

        {/* 4 stat bars */}
        <div className="space-y-2 mb-4">
          <StatBar label="Endurance" value={stats.endurance} colour="bg-emerald-500" />
          <StatBar label="Strength"  value={stats.strength}  colour="bg-red-500" />
          <StatBar label="Recovery"  value={stats.recovery}  colour="bg-blue-500" />
          <StatBar label="Nutrition" value={stats.nutrition} colour="bg-amber-500" />
        </div>

        {/* Quick stats strip */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'km',          value: stats.totalKm + '',    colour: 'text-emerald-400' },
            { label: 'sessions',    value: stats.totalRuns + '',  colour: 'text-blue-400' },
            { label: 'streak',      value: stats.streak + 'd',    colour: 'text-orange-400' },
            { label: 'perfect wks', value: stats.perfectWeeks+'', colour: 'text-purple-400' },
          ].map(s => (
            <div key={s.label} className="bg-white/10 rounded-xl p-2 text-center">
              <div className={`text-sm font-black ${s.colour}`}>{s.value}</div>
              <div className="text-[8px] text-gray-400 mt-0.5 leading-tight">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── XP Feed (recent gains) ───────────────────────────────────────────────────

function XPFeed({ logs, weeks }: {
  logs: Record<string, TrainingLog>
  weeks: import('@/types/database').PlanWeek[]
}) {
  const { SESSION_XP } = require('@/lib/rpg')

  const recent = useMemo(() => {
    return Object.values(logs)
      .filter(l => l.done && l.logged_at)
      .sort((a, b) => new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime())
      .slice(0, 5)
      .map(l => {
        const week = weeks.find(w => w.n === l.week_n)
        const session = week?.days[l.day_i]?.sessions[l.session_i]
        const code = session?.c ?? 'run-easy'
        const xp = SESSION_XP[code] ?? 10
        const bonus = l.km && l.km > 10 ? Math.round(l.km) : 0
        return {
          name: session?.n ?? 'Session',
          xp: xp + bonus,
          date: l.logged_at.slice(0, 10),
          km: l.km,
        }
      })
  }, [logs, weeks])

  if (recent.length === 0) return null

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-50">
        <span className="text-sm font-bold text-gray-900">⚡ Recent XP</span>
      </div>
      <div className="divide-y divide-gray-50">
        {recent.map((r, i) => (
          <div key={i} className="flex items-center justify-between px-4 py-2.5">
            <div>
              <p className="text-xs font-semibold text-gray-800">{r.name}</p>
              <p className="text-[10px] text-gray-400">{r.date}{r.km ? ` · ${r.km}km` : ''}</p>
            </div>
            <div className="text-sm font-black text-teal-600">+{r.xp} XP</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Training Summary ──────────────────────────────────────────────────────────

function TrainingSummary({ logs }: { logs: Record<string, TrainingLog> }) {
  const all = Object.values(logs)
  const done = all.filter(l => l.done)
  const km = done.reduce((a, l) => a + (l.km ?? 0), 0)
  const runs = done.filter(l => l.done).length

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4">
      <p className="text-sm font-bold text-gray-900 mb-3">Training summary</p>
      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <div className="text-2xl font-black text-gray-900">{Math.round(km)}</div>
          <div className="text-[10px] text-gray-400">km logged</div>
        </div>
        <div>
          <div className="text-2xl font-black text-gray-900">{runs}</div>
          <div className="text-[10px] text-gray-400">sessions done</div>
        </div>
        <div>
          <div className="text-2xl font-black text-gray-900">
            {done.length > 0 ? Math.round(done.reduce((a, l) => a + (l.effort ?? 7), 0) / done.length * 10) / 10 : '—'}
          </div>
          <div className="text-[10px] text-gray-400">avg RPE</div>
        </div>
      </div>
    </div>
  )
}

// ─── Strava Section ───────────────────────────────────────────────────────────

function StravaSection({ isConnected, clientId }: { clientId: string | null; isConnected: boolean }) {
  const STRAVA_CLIENT_ID = clientId ?? process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID
  const redirectUri = typeof window !== 'undefined' ? window.location.origin + '/api/strava/callback' : ''

  function connectStrava() {
    if (!STRAVA_CLIENT_ID) return
    const url = `https://www.strava.com/oauth/authorize?client_id=${STRAVA_CLIENT_ID}&redirect_uri=${redirectUri}&response_type=code&scope=activity:read_all`
    window.location.href = url
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-gray-900">Strava</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {isConnected ? 'Connected — sync from Today tab' : 'Connect to auto-import activities'}
          </p>
        </div>
        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${isConnected ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
          {isConnected ? '✓ Connected' : 'Not connected'}
        </span>
      </div>
      {!isConnected && STRAVA_CLIENT_ID && (
        <button onClick={connectStrava}
          className="mt-3 w-full py-2 rounded-xl border border-orange-200 text-orange-600 text-xs font-bold">
          Connect Strava →
        </button>
      )}
    </div>
  )
}

// ─── Athlete Profile Section ───────────────────────────────────────────────────

function AthleteProfileSection() {
  const supabase = useSupabase()
  const { profile, refresh } = useProfile()
  const [saving, setSaving] = useState(false)
  const [weightKg, setWeightKg] = useState('')
  const [injuryNotes, setInjuryNotes] = useState('')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (profile && !loaded) {
      setWeightKg(profile.weight_kg?.toString() ?? '')
      setInjuryNotes((profile as any).injury_notes ?? '')
      setLoaded(true)
    }
  }, [profile, loaded])

  async function save() {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await (supabase as any).from('profiles').upsert({
        id: user.id,
        weight_kg: weightKg ? Number(weightKg) : null,
        injury_notes: injuryNotes || null,
      })
      refresh()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4">
      <p className="text-sm font-bold text-gray-900 mb-3">Athlete profile</p>
      <div className="space-y-3">
        <div>
          <label className="text-[10px] font-semibold text-gray-500 block mb-1">Weight (kg)</label>
          <input type="number" value={weightKg}
            onChange={e => setWeightKg(e.target.value)}
            placeholder="e.g. 75"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D9488]" />
        </div>
        <div>
          <label className="text-[10px] font-semibold text-gray-500 block mb-1">Injury notes</label>
          <textarea value={injuryNotes}
            onChange={e => setInjuryNotes(e.target.value)}
            rows={2} placeholder="Any current niggles or injury history..."
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs resize-none focus:outline-none focus:ring-1 focus:ring-[#0D9488]" />
        </div>
        <button onClick={save} disabled={saving}
          className="w-full py-2.5 rounded-xl bg-gray-900 text-white text-xs font-bold disabled:opacity-50">
          {saving ? 'Saving…' : 'Save profile'}
        </button>
      </div>
    </div>
  )
}

// ─── Main ProfileClient ───────────────────────────────────────────────────────

export default function ProfileClient({
  email,
  displayName: initialDisplayName,
  isStravaConnected,
  stravaStatus,
}: {
  email: string
  displayName: string
  isStravaConnected: boolean
  stravaStatus?: string
}) {
  const router = useRouter()
  const supabase = useSupabase()
  const { plan, weeks } = useActivePlan()
  const { logs } = useTrainingLog(plan?.id ?? null)
  const { profile } = useProfile()

  const [displayName, setDisplayName] = useState(initialDisplayName)
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState(initialDisplayName)
  const [savingName, setSavingName] = useState(false)
  const [stravaClientId, setStravaClientId] = useState<string | null>(null)

  // RPG state — persisted in localStorage, charId optionally in Supabase
  const [charId, setCharId] = useState('m1')
  const [showCharSelect, setShowCharSelect] = useState(false)
  const [badgeToast, setBadgeToast] = useState<RPGBadge | null>(null)
  const [seenBadgeIds, setSeenBadgeIds] = useState<string[]>([])

  useEffect(() => {
    setStravaClientId(localStorage.getItem('strava_client_id'))
    // Load RPG char selection from localStorage
    const saved = localStorage.getItem('nextsplit_rpg_char')
    if (saved) setCharId(saved)
    const seen = localStorage.getItem('nextsplit_rpg_seen_badges')
    if (seen) setSeenBadgeIds(JSON.parse(seen))
  }, [])

  function handleCharSelect(id: string) {
    setCharId(id)
    localStorage.setItem('nextsplit_rpg_char', id)
  }

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

  // Compute RPG stats from Supabase logs
  const allLogs = useMemo(() => Object.values(logs), [logs])

  const rpgStats: RPGStats = useMemo(() => {
    const wellnessCount = parseInt(localStorage.getItem('nextsplit_rpg_wellness_count') || '0')
    const mealDays = parseInt(localStorage.getItem('nextsplit_rpg_meal_days') || '0')
    const suppStreak = parseInt(localStorage.getItem('nextsplit_rpg_supp_streak') || '0')
    return computeRPGStats(
      allLogs.map(l => ({
        done: l.done,
        km: l.km ?? null,
        week_n: l.week_n,
        day_i: l.day_i,
        session_i: l.session_i,
        logged_at: l.logged_at,
        effort: l.effort ?? null,
      })),
      weeks.map(w => ({
        n: w.n,
        days: w.days.map(d => ({
          sessions: d.sessions.map(s => ({ c: s.c, km: s.km })),
        })),
      })),
      wellnessCount,
      mealDays,
      suppStreak,
    )
  }, [allLogs, weeks])

  // Badge unlocking
  const unlockedIds = useMemo(() => {
    return new Set(RPG_BADGES.filter(b => b.check(rpgStats)).map(b => b.id))
  }, [rpgStats])

  // Check for newly unlocked badges and show toast
  useEffect(() => {
    const newBadges = checkNewBadges(rpgStats, seenBadgeIds)
    if (newBadges.length > 0) {
      setBadgeToast(newBadges[0])
      const updated = [...seenBadgeIds, ...newBadges.map(b => b.id)]
      setSeenBadgeIds(updated)
      localStorage.setItem('nextsplit_rpg_seen_badges', JSON.stringify(updated))
    }
  }, [rpgStats, seenBadgeIds])

  // Personal bests
  const personalBests = useMemo(() => computePersonalBests(allLogs), [allLogs])

  // Streak + consistency
  const streak = useMemo(() => computeStreak(allLogs), [allLogs])
  const consistency = useMemo(() => plan
    ? computeConsistency(allLogs, weeks, plan.current_week)
    : { thisWeekPct: 0, last4WeekPct: 0 },
    [allLogs, weeks, plan]
  )

  // Data export
  function handleExport() {
    const exportData = {
      exported_at: new Date().toISOString(),
      plan: plan ? { name: plan.name, current_week: plan.current_week, total_weeks: plan.total_weeks } : null,
      personal_bests: personalBests,
      rpg: { level: rpgStats.level.level, xp: rpgStats.xp, character: charId },
      training_logs: allLogs.map(l => ({
        week: l.week_n, day: l.day_i, session: l.session_i,
        done: l.done, effort: l.effort, km: l.km, pace: l.pace,
        logged_at: l.logged_at,
      })),
    }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `nextsplit-export-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const heroDisplayName = displayName || (RPG_CHARS.find(c => c.id === charId)?.label ?? 'Runner')

  return (
    <div className="min-h-screen bg-[#f8f8f6] pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-4 sticky top-0 z-40">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            {editingName ? (
              <div className="flex items-center gap-2">
                <input value={nameInput} onChange={e => setNameInput(e.target.value)}
                  className="border border-gray-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
                  autoFocus onKeyDown={e => { if (e.key === 'Enter') saveDisplayName() }} />
                <button onClick={saveDisplayName} disabled={savingName}
                  className="text-[11px] font-bold text-[#0D9488]">{savingName ? '…' : 'Save'}</button>
                <button onClick={() => setEditingName(false)}
                  className="text-[11px] text-gray-400">Cancel</button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-gray-900">{displayName || 'Profile'}</h1>
                <button onClick={() => { setNameInput(displayName); setEditingName(true) }}
                  className="text-gray-300 text-sm">✎</button>
              </div>
            )}
            <p className="text-[11px] text-gray-400">{email}</p>
          </div>
          {plan && (
            <span className="text-[11px] bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full font-medium">
              W{plan.current_week}/{plan.total_weeks}
            </span>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">

        {/* Hero RPG Card */}
        <HeroCard
          charId={charId}
          stats={rpgStats}
          displayName={heroDisplayName}
          onEditChar={() => setShowCharSelect(true)}
        />

        {/* Streak + consistency */}
        {(streak.current > 0 || streak.totalDaysLogged > 0) && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="grid grid-cols-2 divide-x divide-gray-50">
              <div className="px-4 py-4 text-center">
                <div className={`text-3xl font-black ${streak.current >= 7 ? 'text-amber-500' : streak.current >= 3 ? 'text-orange-500' : 'text-gray-700'}`}>
                  {streak.current > 0 ? `🔥 ${streak.current}` : '—'}
                </div>
                <div className="text-[10px] text-gray-400 mt-1">day streak</div>
                {streak.longest > streak.current && (
                  <div className="text-[9px] text-gray-300 mt-0.5">best: {streak.longest}</div>
                )}
              </div>
              <div className="px-4 py-4 text-center">
                <div className={`text-3xl font-black ${consistency.last4WeekPct >= 80 ? 'text-emerald-600' : consistency.last4WeekPct >= 60 ? 'text-amber-500' : 'text-gray-500'}`}>
                  {consistency.last4WeekPct}%
                </div>
                <div className="text-[10px] text-gray-400 mt-1">4-week consistency</div>
                <div className="text-[9px] text-gray-300 mt-0.5">this week: {consistency.thisWeekPct}%</div>
              </div>
            </div>
          </div>
        )}

        {/* XP Feed */}
        <XPFeed logs={logs} weeks={weeks} />

        {/* Badges */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-sm font-bold text-gray-900 mb-3">🏆 Badges</p>
          <BadgeGrid unlockedIds={unlockedIds} />
        </div>

        {/* Personal bests */}
        {personalBests.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <p className="text-sm font-bold text-gray-900 mb-3">Personal Bests</p>
            <div className="grid grid-cols-2 gap-2">
              {personalBests.map(pb => (
                <div key={pb.distanceKm} className="bg-gray-50 rounded-xl p-3">
                  <div className="text-[10px] text-gray-400">{RACE_DISTANCES.find(d => Math.abs(d.km - pb.distanceKm) < 0.1)?.label ?? `${pb.distanceKm}km`}</div>
                  <div className="text-sm font-black text-gray-900">{pb.timeStr}</div>
                  <div className="text-[9px] text-gray-400">{pb.pacePerKm}/km</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Training summary */}
        <TrainingSummary logs={logs} />

        {/* Strava */}
        <StravaSection clientId={stravaClientId} isConnected={isStravaConnected} />

        {/* Athlete profile */}
        <AthleteProfileSection />

        {/* Data export */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">Export data</p>
              <p className="text-xs text-gray-400 mt-0.5">Download all logs as JSON</p>
            </div>
            <button onClick={handleExport}
              className="py-2 px-3 rounded-xl bg-gray-100 text-gray-700 text-xs font-semibold">
              ↓ Export
            </button>
          </div>
        </div>

        {/* Sign out */}
        <form action={signout} onSubmit={() => {
          localStorage.removeItem('nextsplit_wellness')
          localStorage.removeItem('nextsplit_rpg_char')
        }}>
          <button type="submit"
            className="w-full py-3 rounded-2xl border border-red-100 text-red-500 text-sm font-semibold bg-white">
            Sign out
          </button>
        </form>

      </div>

      {/* Character select modal */}
      {showCharSelect && (
        <CharSelectModal
          currentCharId={charId}
          onSelect={handleCharSelect}
          onClose={() => setShowCharSelect(false)}
        />
      )}

      {/* Badge unlock toast */}
      {badgeToast && (
        <BadgeToast badge={badgeToast} onDismiss={() => setBadgeToast(null)} />
      )}
    </div>
  )
}
