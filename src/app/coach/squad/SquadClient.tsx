'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import type { CoachProfile } from '@/types/database'
import { RUNNER_CLASSES } from '@/lib/rpg'
import type { RunnerClassId } from '@/lib/rpg'

interface AthleteStatus {
  athlete_id:          string
  display_name:        string | null
  handle:              string | null
  status:              'green' | 'amber' | 'red'
  flags:               string[]
  acwr:                number | null
  sessions_done_week:  number
  sessions_total_week: number
  last_active:         string | null
  avg_wellness:        number | null
  current_week:        number | null
  total_weeks:         number | null
  plan_name:           string | null
  runner_class:        string | null
}

const STATUS = {
  green: { dot: 'bg-emerald-400', ring: 'border-slate-200',  badge: 'bg-emerald-100 text-emerald-700', label: 'On track'  },
  amber: { dot: 'bg-amber-400',   ring: 'border-amber-300',  badge: 'bg-amber-100 text-amber-700',    label: 'Check in'  },
  red:   { dot: 'bg-red-400',     ring: 'border-red-300',    badge: 'bg-red-100 text-red-700',        label: 'Needs you' },
}

function InviteModal({ onClose }: { onClose: () => void }) {
  const [loading, setLoading]     = useState(false)
  const [inviteUrl, setInviteUrl] = useState('')
  const [copied, setCopied]       = useState(false)

  const generate = async () => {
    setLoading(true)
    try {
      const res  = await fetch('/api/coach/invite', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
      const data = await res.json()
      if (data.inviteUrl) setInviteUrl(data.inviteUrl)
    } finally { setLoading(false) }
  }

  const copy = async () => {
    await navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl p-6 space-y-4 max-w-lg mx-auto">
        <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto" />
        <h2 className="text-base font-black text-slate-900">Invite an athlete</h2>
        <p className="text-sm text-slate-500">Each link is single-use and expires in 7 days. Generate a new one for each athlete.</p>
        {!inviteUrl ? (
          <button onClick={generate} disabled={loading}
            className="w-full bg-teal-500 text-white py-4 rounded-2xl text-sm font-bold disabled:opacity-50 active:scale-95">
            {loading ? 'Generating…' : 'Generate invite link →'}
          </button>
        ) : (
          <div className="space-y-3">
            <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-600 font-mono break-all border border-slate-200">{inviteUrl}</div>
            <button onClick={copy} className={`w-full py-4 rounded-2xl text-sm font-bold transition-all ${copied ? 'bg-emerald-500 text-white' : 'bg-teal-500 text-white'}`}>
              {copied ? '✓ Copied to clipboard!' : 'Copy invite link'}
            </button>
            <button onClick={generate} className="w-full py-2 text-xs text-slate-400">Generate another link</button>
          </div>
        )}
        <button onClick={onClose} className="w-full text-slate-400 text-sm py-2">Close</button>
      </div>
    </>
  )
}

function AthleteCard({ athlete, onMessage }: { athlete: AthleteStatus; onMessage: (id: string) => void }) {
  const cfg       = STATUS[athlete.status]
  const name      = athlete.display_name ?? (athlete.handle ? `@${athlete.handle}` : 'Athlete')
  const daysSince = athlete.last_active
    ? Math.floor((new Date().getTime() - new Date(athlete.last_active).getTime()) / (24 * 3600 * 1000))
    : null

  // Character class — spec: "coach sees athletes as characters in the dashboard"
  const cls = athlete.runner_class
    ? RUNNER_CLASSES[athlete.runner_class as RunnerClassId]
    : null

  return (
    <div className={`bg-white rounded-2xl border-2 overflow-hidden ${cfg.ring}`}>
      {/* Main row */}
      <a href={`/coach/athlete/${athlete.athlete_id}`} className="flex items-center gap-3 px-4 py-3.5 active:bg-slate-50">
        {/* Character avatar — class emoji replaces generic 🏃 */}
        <div className="relative shrink-0">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${cls ? '' : 'bg-gray-100'}`}
            style={cls ? { background: cls.bg.replace('bg-', '') + '20', border: `2px solid ${cls.colour}40` } : {}}>
            {cls ? cls.emoji : '🏃'}
          </div>
          <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${cfg.dot}`} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-slate-900 truncate">{name}</p>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${cfg.badge}`}>
              {cfg.label}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            {athlete.plan_name && (
              <p className="text-xs text-slate-400 truncate">
                {athlete.plan_name} · W{athlete.current_week}/{athlete.total_weeks}
              </p>
            )}
            {cls && (
              <>
                {athlete.plan_name && <span className="text-[10px] text-slate-300">·</span>}
                <span className="text-[10px] text-slate-400 shrink-0">{cls.name}</span>
              </>
            )}
          </div>
        </div>

        <span className="text-slate-300 text-lg shrink-0">›</span>
      </a>

      {/* Stats strip */}
      <div className="grid grid-cols-3 divide-x divide-slate-100 border-t border-slate-100">
        <div className="px-3 py-2 text-center">
          <p className="text-xs font-black text-slate-800">
            {athlete.sessions_done_week}/{athlete.sessions_total_week || '?'}
          </p>
          <p className="text-[9px] text-slate-400">sessions</p>
        </div>
        <div className={`px-3 py-2 text-center ${
          athlete.acwr === null ? '' :
          athlete.acwr > 1.3 ? 'bg-red-50' :
          athlete.acwr < 0.8 ? 'bg-amber-50' : 'bg-emerald-50'
        }`}>
          <p className={`text-xs font-black ${
            athlete.acwr === null ? 'text-slate-400' :
            athlete.acwr > 1.3 ? 'text-red-700' :
            athlete.acwr < 0.8 ? 'text-amber-700' : 'text-emerald-700'
          }`}>
            {athlete.acwr?.toFixed(2) ?? '—'}
          </p>
          <p className="text-[9px] text-slate-400">ACWR</p>
        </div>
        <div className="px-3 py-2 text-center">
          <p className="text-xs font-black text-slate-800">
            {daysSince === null ? '—' : daysSince === 0 ? 'Today' : `${daysSince}d`}
          </p>
          <p className="text-[9px] text-slate-400">last active</p>
        </div>
      </div>

      {/* Flags — only if red/amber */}
      {athlete.flags.length > 0 && (
        <div className="px-4 pb-3 pt-1 space-y-1">
          {athlete.flags.map(f => (
            <div key={f} className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 rounded-lg px-2.5 py-1.5">
              <span>{f}</span>
            </div>
          ))}
        </div>
      )}

      {/* Quick actions — message */}
      <div className="px-4 pb-3 flex gap-2">
        <button
          onClick={() => onMessage(athlete.athlete_id)}
          className="flex-1 bg-slate-100 text-slate-700 text-xs font-semibold py-2 rounded-xl active:bg-slate-200"
        >
          💬 Message
        </button>
        <a
          href={`/coach/athlete/${athlete.athlete_id}`}
          className="flex-1 bg-teal-50 text-teal-700 text-xs font-semibold py-2 rounded-xl text-center active:bg-teal-100"
        >
          📊 View data
        </a>
      </div>
    </div>
  )
}

export default function SquadClient({ coachProfile }: { coachProfile: CoachProfile }) {
  const [athletes, setAthletes]       = useState<AthleteStatus[]>([])
  const [loading, setLoading]         = useState(true)
  const [showInvite, setShowInvite]   = useState(false)
  const [filter, setFilter]           = useState<'all' | 'red' | 'amber' | 'green'>('all')

  const fetchStatus = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch('/api/coach/squad-status')
      const data = await res.json()
      setAthletes(data.athletes ?? [])
      setLoading(false)
    } catch {
      setLoading(false)
    }
  }, [])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchStatus() }, [fetchStatus])

  const filtered = filter === 'all' ? athletes : athletes.filter(a => a.status === filter)
  const red      = athletes.filter(a => a.status === 'red')
  const amber    = athletes.filter(a => a.status === 'amber')
  const green    = athletes.filter(a => a.status === 'green')

  const handleMessage = (athleteId: string) => {
    window.location.href = `/coach/athlete/${athleteId}?tab=message`
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-28">

      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-4 pt-12 pb-4 sticky top-0 z-40">
        <div className="max-w-lg mx-auto space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-black text-slate-900">Athletes</h1>
              <p className="text-xs text-slate-400">
                {coachProfile.display_name}
                {coachProfile.verified && ' · ✅ Verified'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={fetchStatus} className="text-slate-400 text-lg px-1.5">↻</button>
              <button
                onClick={() => setShowInvite(true)}
                className="bg-teal-500 text-white text-sm font-bold px-4 py-2 rounded-xl active:scale-95"
              >
                + Invite
              </button>
            </div>
          </div>

          {/* Status summary pills */}
          {athletes.length > 0 && (
            <div className="flex gap-2">
              {[
                { key: 'all',   label: `All (${athletes.length})`,  colour: filter === 'all'   ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600' },
                { key: 'red',   label: `🔴 ${red.length}`,          colour: filter === 'red'   ? 'bg-red-500 text-white'   : 'bg-red-50 text-red-700' },
                { key: 'amber', label: `🟡 ${amber.length}`,        colour: filter === 'amber' ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-700' },
                { key: 'green', label: `🟢 ${green.length}`,        colour: filter === 'green' ? 'bg-emerald-500 text-white' : 'bg-emerald-50 text-emerald-700' },
              ].map(f => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key as typeof filter)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${f.colour}`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-3">

        {/* Empty state — no athletes */}
        {!loading && athletes.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-4">
            <div className="text-5xl">👥</div>
            <div>
              <h2 className="text-base font-bold text-slate-800">No athletes yet</h2>
              <p className="text-sm text-slate-500 mt-1">
                Invite your first athlete — they&apos;ll get a personalised welcome page with your profile and coaching offer.
              </p>
            </div>
            <button
              onClick={() => setShowInvite(true)}
              className="bg-teal-500 text-white text-sm font-bold px-8 py-3 rounded-xl active:scale-95"
            >
              Invite first athlete →
            </button>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && [1,2,3].map(i => (
          <div key={i} className="bg-white rounded-2xl border border-slate-200 animate-pulse">
            <div className="flex items-center gap-3 px-4 py-4">
              <div className="w-10 h-10 rounded-full bg-slate-100 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-28 bg-slate-100 rounded" />
                <div className="h-2 w-20 bg-slate-100 rounded" />
              </div>
            </div>
            <div className="grid grid-cols-3 divide-x divide-slate-100 border-t border-slate-100">
              {[1,2,3].map(j => <div key={j} className="px-3 py-3 flex flex-col items-center gap-1"><div className="h-3 w-8 bg-slate-100 rounded" /><div className="h-2 w-10 bg-slate-100 rounded" /></div>)}
            </div>
          </div>
        ))}

        {/* Athlete cards — red first then amber then green */}
        {!loading && filtered.map(a => (
          <AthleteCard key={a.athlete_id} athlete={a} onMessage={handleMessage} />
        ))}

        {/* Coach tools row */}
        {athletes.length > 0 && (
          <div className="pt-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Coach tools</p>
            <div className="grid grid-cols-2 gap-3">
              <Link href="/coach/plan-builder"
                className="bg-white rounded-2xl border border-slate-200 p-3.5 space-y-1 active:bg-slate-50">
                <span className="text-xl">📋</span>
                <p className="text-sm font-bold text-slate-800">Plan Builder</p>
                <p className="text-xs text-slate-400">Build plans for your athletes</p>
              </Link>
              <Link href="/marketplace"
                className="bg-white rounded-2xl border border-slate-200 p-3.5 space-y-1 active:bg-slate-50">
                <span className="text-xl">🏪</span>
                <p className="text-sm font-bold text-slate-800">Marketplace</p>
                <p className="text-xs text-slate-400">Browse and publish plans</p>
              </Link>
              <Link href="/community"
                className="bg-white rounded-2xl border border-slate-200 p-3.5 space-y-1 active:bg-slate-50">
                <span className="text-xl">👥</span>
                <p className="text-sm font-bold text-slate-800">Community</p>
                <p className="text-xs text-slate-400">Clubs, challenges, races</p>
              </Link>
              <button
                onClick={async () => {
                  const res = await fetch('/api/stripe/connect', { method: 'POST' })
                  const d   = await res.json()
                  if (d.url) window.location.href = d.url
                }}
                className="bg-white rounded-2xl border border-slate-200 p-3.5 space-y-1 text-left active:bg-slate-50">
                <span className="text-xl">💳</span>
                <p className="text-sm font-bold text-slate-800">Payouts</p>
                <p className="text-xs text-slate-400">Set up Stripe payments</p>
              </button>
            </div>
          </div>
        )}

        {/* Profile card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Your coach profile</p>
            <a href={`/coach/${coachProfile.slug}`} className="text-xs text-teal-600 font-semibold">
              View public →
            </a>
          </div>
          {coachProfile.bio && (
            <p className="text-sm text-slate-600 leading-relaxed">{coachProfile.bio}</p>
          )}
          {coachProfile.specialities && coachProfile.specialities.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {coachProfile.specialities.map(s => (
                <span key={s} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{s}</span>
              ))}
            </div>
          )}
          {!coachProfile.verified && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mt-1">
              <p className="text-xs text-amber-700 font-semibold">🔓 Apply for ✅ verification to unlock marketplace featuring</p>
            </div>
          )}
        </div>
      </div>

      {showInvite && <InviteModal onClose={() => setShowInvite(false)} />}
    </div>
  )
}
