'use client'

import { useState, useEffect } from 'react'
import { useCoach } from '@/hooks/useCoach'
import type { CoachProfile } from '@/types/database'

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
}

const STATUS_CONFIG = {
  green: { dot: 'bg-emerald-400', label: 'On track',  bg: 'border-slate-200' },
  amber: { dot: 'bg-amber-400',   label: 'Attention', bg: 'border-amber-300' },
  red:   { dot: 'bg-red-400',     label: 'Flag',      bg: 'border-red-300' },
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
        <p className="text-sm text-slate-500">Generate a unique invite link. Each link is single-use and expires in 7 days.</p>
        {!inviteUrl ? (
          <button onClick={generate} disabled={loading}
            className="w-full bg-teal-500 text-white py-3.5 rounded-2xl text-sm font-bold disabled:opacity-50">
            {loading ? 'Generating…' : 'Generate invite link →'}
          </button>
        ) : (
          <div className="space-y-3">
            <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-600 font-mono break-all border border-slate-200">{inviteUrl}</div>
            <button onClick={copy} className={`w-full py-3.5 rounded-2xl text-sm font-bold ${copied ? 'bg-emerald-500 text-white' : 'bg-teal-500 text-white'}`}>
              {copied ? '✓ Copied!' : 'Copy invite link'}
            </button>
            <button onClick={generate} className="w-full py-2 text-xs text-slate-400">
              Generate another link
            </button>
          </div>
        )}
        <button onClick={onClose} className="w-full text-slate-400 text-sm py-2">Close</button>
      </div>
    </>
  )
}

function AthleteStatusCard({ athlete }: { athlete: AthleteStatus }) {
  const cfg  = STATUS_CONFIG[athlete.status]
  const name = athlete.display_name ?? (athlete.handle ? `@${athlete.handle}` : 'Athlete')

  const daysSince = athlete.last_active
    ? Math.floor((Date.now() - new Date(athlete.last_active).getTime()) / (24 * 3600 * 1000))
    : null

  return (
    <a href={`/coach/athlete/${athlete.athlete_id}`}
      className={`block bg-white rounded-2xl border-2 p-4 space-y-3 active:bg-slate-50 transition-all ${cfg.bg}`}>
      {/* Top row */}
      <div className="flex items-center gap-3">
        <div className={`w-3 h-3 rounded-full shrink-0 ${cfg.dot}`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-900 truncate">{name}</p>
          {athlete.plan_name && (
            <p className="text-xs text-slate-400 truncate">
              {athlete.plan_name} · W{athlete.current_week}/{athlete.total_weeks}
            </p>
          )}
        </div>
        <span className="text-slate-300 text-sm shrink-0">›</span>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-slate-50 rounded-xl py-2">
          <p className="text-sm font-black text-slate-800">
            {athlete.sessions_done_week}/{athlete.sessions_total_week || '?'}
          </p>
          <p className="text-[10px] text-slate-400">sessions</p>
        </div>
        <div className={`rounded-xl py-2 ${
          athlete.acwr === null ? 'bg-slate-50' :
          athlete.acwr > 1.3 ? 'bg-red-50' :
          athlete.acwr < 0.8 ? 'bg-amber-50' : 'bg-emerald-50'
        }`}>
          <p className={`text-sm font-black ${
            athlete.acwr === null ? 'text-slate-400' :
            athlete.acwr > 1.3 ? 'text-red-700' :
            athlete.acwr < 0.8 ? 'text-amber-700' : 'text-emerald-700'
          }`}>
            {athlete.acwr?.toFixed(2) ?? '—'}
          </p>
          <p className="text-[10px] text-slate-400">ACWR</p>
        </div>
        <div className="bg-slate-50 rounded-xl py-2">
          <p className="text-sm font-black text-slate-800">
            {daysSince === null ? '—' : daysSince === 0 ? 'Today' : `${daysSince}d`}
          </p>
          <p className="text-[10px] text-slate-400">last run</p>
        </div>
      </div>

      {/* Flags */}
      {athlete.flags.length > 0 && (
        <div className="space-y-1">
          {athlete.flags.map(f => (
            <p key={f} className="text-xs text-amber-700 bg-amber-50 rounded-lg px-2.5 py-1.5">{f}</p>
          ))}
        </div>
      )}
    </a>
  )
}

export default function SquadClient({ coachProfile }: { coachProfile: CoachProfile }) {
  const { loading: coachLoading }           = useCoach()
  const [athletes, setAthletes]             = useState<AthleteStatus[]>([])
  const [loadingStatus, setLoadingStatus]   = useState(true)
  const [showInvite, setShowInvite]         = useState(false)

  const fetchStatus = async () => {
    setLoadingStatus(true)
    try {
      const res  = await fetch('/api/coach/squad-status')
      const data = await res.json()
      setAthletes(data.athletes ?? [])
    } finally {
      setLoadingStatus(false)
    }
  }

  useEffect(() => { fetchStatus() }, [])

  const green  = athletes.filter(a => a.status === 'green')
  const amber  = athletes.filter(a => a.status === 'amber')
  const red    = athletes.filter(a => a.status === 'red')

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-4 pt-12 pb-4 sticky top-0 z-40">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-black text-slate-900">Squad</h1>
            <p className="text-xs text-slate-400">{coachProfile.display_name}</p>
          </div>
          <div className="flex items-center gap-2">
            {coachProfile.verified && (
              <span className="text-xs bg-teal-50 text-teal-700 border border-teal-200 px-2 py-1 rounded-full font-bold">✅ Verified</span>
            )}
            <button onClick={fetchStatus} className="text-slate-400 text-lg px-2">↻</button>
            <button onClick={() => setShowInvite(true)}
              className="bg-teal-500 text-white text-xs font-bold px-3 py-2 rounded-xl active:scale-95">
              + Invite
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-5">

        {/* Status summary */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: '🟢 On track', value: green.length, colour: 'text-emerald-600' },
            { label: '🟡 Attention', value: amber.length, colour: 'text-amber-600' },
            { label: '🔴 Flag',      value: red.length,   colour: 'text-red-600' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-slate-200 p-3 text-center">
              <p className={`text-2xl font-black ${s.colour}`}>{s.value}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-3 gap-2">
          <a href="/coach/plan-builder"
            className="bg-white rounded-xl border border-slate-200 p-2.5 text-center text-xs font-semibold text-slate-700 active:bg-slate-50">
            📋 Plan Builder
          </a>
          <a href="/community"
            className="bg-white rounded-xl border border-slate-200 p-2.5 text-center text-xs font-semibold text-slate-700 active:bg-slate-50">
            👥 Community
          </a>
          <button
            onClick={async () => {
              const res = await fetch('/api/stripe/connect', { method: 'POST' })
              const d   = await res.json()
              if (d.url) window.location.href = d.url
            }}
            className="bg-white rounded-xl border border-slate-200 p-2.5 text-center text-xs font-semibold text-slate-700 active:bg-slate-50">
            💳 Payouts
          </button>
        </div>

        {/* Empty state */}
        {!loadingStatus && athletes.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3">
            <div className="text-4xl">👥</div>
            <h2 className="text-base font-bold text-slate-800">No athletes yet</h2>
            <p className="text-sm text-slate-500">Generate an invite link to get started.</p>
            <button onClick={() => setShowInvite(true)}
              className="bg-teal-500 text-white text-sm font-bold px-6 py-3 rounded-xl mt-2 active:scale-95">
              Invite first athlete →
            </button>
          </div>
        )}

        {/* Red flags first */}
        {red.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-bold text-red-500 uppercase tracking-wider">🔴 Needs attention ({red.length})</p>
            {red.map(a => <AthleteStatusCard key={a.athlete_id} athlete={a} />)}
          </div>
        )}

        {/* Amber */}
        {amber.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-bold text-amber-500 uppercase tracking-wider">🟡 Check in ({amber.length})</p>
            {amber.map(a => <AthleteStatusCard key={a.athlete_id} athlete={a} />)}
          </div>
        )}

        {/* Green */}
        {green.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-bold text-emerald-500 uppercase tracking-wider">🟢 On track ({green.length})</p>
            {green.map(a => <AthleteStatusCard key={a.athlete_id} athlete={a} />)}
          </div>
        )}

        {/* Coach profile card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Your profile</p>
            <a href={`/coach/${coachProfile.slug}`} className="text-xs text-teal-600 font-semibold">
              View public →
            </a>
          </div>
          {coachProfile.bio && <p className="text-sm text-slate-600">{coachProfile.bio}</p>}
          {!coachProfile.verified && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
              <p className="text-xs text-amber-700 font-semibold">🔓 Unverified — apply for ✅ verification</p>
              <p className="text-xs text-amber-600 mt-0.5">Verified coaches get marketplace featuring eligibility.</p>
            </div>
          )}
        </div>
      </div>

      {showInvite && <InviteModal onClose={() => setShowInvite(false)} />}
    </div>
  )
}
