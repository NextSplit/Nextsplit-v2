'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { RUNNER_CLASSES } from '@/lib/rpg'
import type { RunnerClassId } from '@/lib/rpg'

// ─── Types ───────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>

interface Props {
  athleteId:    string
  coachId:      string
  profile:      AnyRecord | null
  logs:         AnyRecord[]
  wellness:     AnyRecord[]
  activePlan:   AnyRecord | null
  relationship: AnyRecord
  messages:     AnyRecord[]
  isCoachPro:   boolean
}

// Quick reaction options — B3 spec
const REACTIONS = [
  { id: 'fire',   emoji: '🔥', label: 'Great session'    },
  { id: 'strong', emoji: '💙', label: 'Well paced'       },
  { id: 'easy',   emoji: '🧊', label: 'Take it easy'     },
  { id: 'talk',   emoji: '📞', label: 'Let\'s talk'      },
]

// ─── Sub-components ──────────────────────────────────────────────────────────

function Sparkline({ values, colour }: { values: number[]; colour: string }) {
  if (values.length < 2) return <span className="text-xs text-[var(--color-text-tertiary)]">—</span>
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const w = 60
  const h = 24
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w
    const y = h - ((v - min) / range) * h
    return `${x},${y}`
  }).join(' ')
  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline points={pts} fill="none" stroke={colour} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function WeeklyACWRBar({ week, acwr }: { week: number; acwr: number }) {
  const colour = acwr > 1.3 ? '#ef4444' : acwr < 0.8 ? '#f59e0b' : '#8b5cf6'
  const height = Math.min(Math.round(acwr * 30), 60)
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative flex items-end" style={{ height: 60 }}>
        <div className="w-5 rounded-t-sm transition-all"
          style={{ height, background: colour, opacity: 0.85 }} />
      </div>
      <span className="text-[8px] text-[var(--color-text-tertiary)]">W{week}</span>
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function AthleteDetailClient({
  athleteId, coachId, profile, logs, wellness, activePlan, relationship, messages, isCoachPro,
}: Props) {
  const [tab, setTab]                         = useState<'overview' | 'sessions' | 'comms'>('overview')
  const [messageBody, setMessageBody]         = useState('')
  const [sendingMsg, setSendingMsg]           = useState(false)
  const [sentMsg, setSentMsg]                 = useState(false)
  const [showSchedule, setShowSchedule]       = useState(false)
  const [schedBody, setSchedBody]             = useState('')
  const [schedDate, setSchedDate]             = useState('')
  const [schedTime, setSchedTime]             = useState('08:00')
  const [scheduling, setScheduling]           = useState(false)
  const [scheduledMsgs, setScheduledMsgs]     = useState<AnyRecord[]>([])
  const [scheduledLoaded, setScheduledLoaded] = useState(false)
  const [reactions, setReactions]             = useState<Record<string, string>>({})
  const [digestLoading, setDigestLoading]     = useState(false)
  const [digest, setDigest]                   = useState('')
  const [showDigest, setShowDigest]           = useState(false)

  const name  = profile?.display_name ?? (profile?.handle ? `@${profile.handle}` : 'Athlete')
  const cls   = profile?.runner_class ? RUNNER_CLASSES[profile.runner_class as RunnerClassId] : null
  const doneLogs = logs.filter(l => l.done)

  // ── ACWR computation (12 weeks) ──────────────────────────────────────────
  const acwrByWeek = useMemo(() => {
    const kmByWeek: Record<number, number> = {}
    doneLogs.forEach(l => {
      kmByWeek[l.week_n] = (kmByWeek[l.week_n] ?? 0) + (l.km ?? 0)
    })
    const weeks = Object.keys(kmByWeek).map(Number).sort((a, b) => a - b)
    return weeks.map((wn, i) => {
      const acute    = kmByWeek[wn]
      const chronic  = i >= 1
        ? weeks.slice(Math.max(0, i - 3), i).reduce((s, w) => s + (kmByWeek[w] ?? 0), 0) /
          Math.min(i, 3)
        : 0
      return { week: wn, acwr: chronic > 0 ? Math.round((acute / chronic) * 100) / 100 : 0, km: acute }
    })
  }, [doneLogs])

  const latestACWR = acwrByWeek[acwrByWeek.length - 1]?.acwr ?? null

  // ── This week sessions ───────────────────────────────────────────────────
  const thisWeekLogs = useMemo(() => {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - cutoff.getDay()) // start of this week
    return doneLogs
      .filter(l => new Date(l.logged_at) >= cutoff)
      .sort((a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime())
  }, [doneLogs])

  // ── Wellness sparklines ──────────────────────────────────────────────────
  const wellnessReversed = [...wellness].reverse()
  const sleepVals    = wellnessReversed.map(w => w.sleep ?? 0).filter(Boolean)
  const sorenessVals = wellnessReversed.map(w => w.soreness ?? 0).filter(Boolean)
  const moodVals     = wellnessReversed.map(w => w.mood ?? 0).filter(Boolean)

  // ── Helpers ──────────────────────────────────────────────────────────────
  async function sendMessage() {
    if (!messageBody.trim()) return
    setSendingMsg(true)
    try {
      await fetch('/api/coach/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coach_id: coachId, athlete_id: athleteId, body: messageBody }),
      })
      setSentMsg(true)
      setMessageBody('')
      setTimeout(() => setSentMsg(false), 2000)
    } finally { setSendingMsg(false) }
  }

  async function sendReaction(logKey: string, reaction: string) {
    setReactions(r => ({ ...r, [logKey]: reaction }))
    await fetch('/api/coach/annotate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        athlete_id: athleteId,
        plan_id:    activePlan?.id ?? 'general',
        week_n:     activePlan?.current_week ?? 0,
        day_i: 0, session_i: 0,
        reaction,
      }),
    }).catch(() => {})
  }

  async function fetchDigest() {
    setDigestLoading(true)
    try {
      const res  = await fetch('/api/ai/coach-digest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ athlete_id: athleteId }),
      })
      const data = await res.json()
      setDigest(data.digest ?? 'Unable to generate digest')
      setShowDigest(true)
    } finally { setDigestLoading(false) }
  }

  return (
    <div className="min-h-screen pb-24" style={{ background: '#f8f8f6' }}>

      {/* Header */}
      <div className="bg-white border-b border-[var(--color-border)] px-4 pt-12 pb-0 sticky top-0 z-40">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3 pb-3">
            <Link href="/coach/squad" className="text-[var(--color-text-tertiary)] text-xl">←</Link>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black text-gray-900 truncate">{name}</h1>
                {cls && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${cls.bg} ${cls.textColour}`}>
                    {cls.emoji} {cls.name}
                  </span>
                )}
              </div>
              {activePlan && (
                <p className="text-xs text-[var(--color-text-tertiary)]">
                  Week {activePlan.current_week}/{activePlan.total_weeks} · {activePlan.name}
                  {activePlan.race_date && ` · Race ${new Date(activePlan.race_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`}
                </p>
              )}
            </div>
            <button
              onClick={fetchDigest}
              disabled={digestLoading}
              className="text-xs font-bold px-3 py-2 rounded-xl border border-[var(--color-border-2)] text-[var(--color-text-secondary)] disabled:opacity-50 flex-shrink-0"
            >
              {digestLoading ? '…' : '🧠 AI digest'}
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-[var(--color-surface-2)] rounded-xl p-1">
            {(['overview', 'sessions', 'comms'] as const).map(t => (
              <button key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-2 rounded-lg text-xs font-bold capitalize transition-all ${
                  tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-[var(--color-text-tertiary)]'
                }`}
              >
                {t === 'comms' ? '💬 Comms' : t === 'sessions' ? '📊 Sessions' : '👤 Overview'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4 space-y-4">

        {/* AI Digest */}
        {showDigest && digest && (
          <div className="bg-white rounded-2xl border border-[var(--color-border)] p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-[var(--color-text-tertiary)] uppercase tracking-wider">🧠 AI coaching digest</p>
              <button onClick={() => setShowDigest(false)} className="text-[var(--color-text-tertiary)] text-sm">✕</button>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">{digest}</p>
          </div>
        )}

        {/* ── OVERVIEW TAB ── */}
        {tab === 'overview' && (
          <>
            {/* Key metrics */}
            <div className="grid grid-cols-3 gap-2">
              {[
                {
                  label: 'ACWR',
                  value: latestACWR?.toFixed(2) ?? '—',
                  colour: latestACWR === null ? '#9ca3af'
                    : latestACWR > 1.3 ? '#ef4444'
                    : latestACWR < 0.8 ? '#f59e0b' : '#8b5cf6',
                  sub: latestACWR === null ? '' : latestACWR > 1.3 ? 'High load' : latestACWR < 0.8 ? 'Low load' : 'Good zone',
                },
                {
                  label: 'This week',
                  value: `${thisWeekLogs.length} sessions`,
                  colour: '#8b5cf6',
                  sub: `${thisWeekLogs.reduce((s, l) => s + (l.km ?? 0), 0).toFixed(0)}km`,
                },
                {
                  label: '12-week km',
                  value: `${doneLogs.reduce((s, l) => s + (l.km ?? 0), 0).toFixed(0)}`,
                  colour: '#8b5cf6',
                  sub: 'total km',
                },
              ].map(m => (
                <div key={m.label} className="bg-white rounded-2xl border border-[var(--color-border)] p-3 text-center">
                  <p className="text-[10px] text-[var(--color-text-tertiary)] uppercase tracking-wider mb-1">{m.label}</p>
                  <p className="text-lg font-black" style={{ color: m.colour }}>{m.value}</p>
                  <p className="text-[10px] text-[var(--color-text-tertiary)]">{m.sub}</p>
                </div>
              ))}
            </div>

            {/* 12-week ACWR chart */}
            {acwrByWeek.length > 1 && (
              <div className="bg-white rounded-2xl border border-[var(--color-border)] p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-bold text-[var(--color-text-tertiary)] uppercase tracking-wider">Training load — 12 weeks</p>
                  <div className="flex items-center gap-3 text-[9px]">
                    <span className="text-red-500">● &gt;1.3 high</span>
                    <span className="text-amber-500">● &lt;0.8 low</span>
                    <span className="text-emerald-600">● good</span>
                  </div>
                </div>
                <div className="flex items-end gap-1 justify-center">
                  {acwrByWeek.slice(-12).map(w => (
                    <WeeklyACWRBar key={w.week} week={w.week} acwr={w.acwr} />
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-4 text-[10px] text-[var(--color-text-tertiary)]">
                  {acwrByWeek.slice(-12).map(w => (
                    <span key={w.week}>{w.km.toFixed(0)}km</span>
                  ))}
                </div>
              </div>
            )}

            {/* Wellness sparklines */}
            {wellness.length > 3 && (
              <div className="bg-white rounded-2xl border border-[var(--color-border)] p-4">
                <p className="text-xs font-bold text-[var(--color-text-tertiary)] uppercase tracking-wider mb-3">Wellness trend (30 days)</p>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'Sleep', values: sleepVals,    colour: '#6366f1', avg: sleepVals.length ? (sleepVals.reduce((a,b) => a+b, 0) / sleepVals.length).toFixed(1) : '—' },
                    { label: 'Soreness', values: sorenessVals, colour: '#f59e0b', avg: sorenessVals.length ? (sorenessVals.reduce((a,b) => a+b, 0) / sorenessVals.length).toFixed(1) : '—' },
                    { label: 'Mood', values: moodVals,      colour: '#10b981', avg: moodVals.length ? (moodVals.reduce((a,b) => a+b, 0) / moodVals.length).toFixed(1) : '—' },
                  ].map(w => (
                    <div key={w.label} className="text-center">
                      <p className="text-[10px] text-[var(--color-text-tertiary)] mb-1">{w.label}</p>
                      <Sparkline values={w.values} colour={w.colour} />
                      <p className="text-xs font-bold text-gray-700 mt-1">{w.avg}/5</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* This week sessions with quick reactions */}
            {thisWeekLogs.length > 0 && (
              <div className="bg-white rounded-2xl border border-[var(--color-border)] p-4">
                <p className="text-xs font-bold text-[var(--color-text-tertiary)] uppercase tracking-wider mb-3">This week</p>
                <div className="space-y-3">
                  {thisWeekLogs.map((log, i) => {
                    const key     = `${log.week_n}_${log.day_i}_${log.session_i}`
                    const reacted = reactions[key]
                    const date    = new Date(log.logged_at).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })
                    return (
                      <div key={i} className="space-y-2">
                        <div className="flex items-start gap-2">
                          <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs"
                            style={{ background: 'var(--ns-violet-light)', color: 'var(--ns-violet)' }}>
                            ✓
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-bold text-gray-800">{date}</p>
                              <div className="flex gap-1">
                                {log.km && <span className="text-[10px] text-[var(--color-text-tertiary)]">{log.km}km</span>}
                                {log.effort && <span className="text-[10px] text-[var(--color-text-tertiary)]">· {log.effort}/10</span>}
                              </div>
                            </div>
                            {log.notes && <p className="text-[11px] text-[var(--color-text-tertiary)] mt-0.5">{log.notes}</p>}
                          </div>
                        </div>
                        {/* Quick reactions */}
                        <div className="flex gap-1.5 pl-8">
                          {REACTIONS.map(r => (
                            <button key={r.id}
                              onClick={() => sendReaction(key, r.id)}
                              className={`text-base px-2 py-1 rounded-xl border transition-all ${
                                reacted === r.id
                                  ? 'border-[var(--ns-ember)] bg-[var(--ns-violet-light)] scale-110'
                                  : 'border-[var(--color-border)] hover:border-[var(--color-border-2)] bg-white'
                              }`}
                              title={r.label}
                            >
                              {r.emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── SESSIONS TAB ── */}
        {tab === 'sessions' && (
          <div className="space-y-3">
            {!relationship.share_logs ? (
              <div className="bg-white rounded-2xl border border-[var(--color-border)] p-6 text-center">
                <p className="text-sm text-[var(--color-text-tertiary)]">Athlete hasn't shared training logs</p>
              </div>
            ) : doneLogs.length === 0 ? (
              <div className="bg-white rounded-2xl border border-[var(--color-border)] p-6 text-center">
                <p className="text-sm text-[var(--color-text-tertiary)]">No sessions logged in last 12 weeks</p>
              </div>
            ) : (
              doneLogs.slice(0, 30).map((log, i) => {
                const key  = `${log.week_n}_${log.day_i}_${log.session_i}`
                const date = new Date(log.logged_at).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
                return (
                  <div key={i} className="bg-white rounded-2xl border border-[var(--color-border)] px-4 py-3">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-bold text-gray-800">{date}</p>
                      <div className="flex gap-2 text-[10px] text-[var(--color-text-tertiary)]">
                        {log.km && <span>{log.km}km</span>}
                        {log.pace && <span>{log.pace}/km</span>}
                        {log.effort && <span>effort {log.effort}/10</span>}
                      </div>
                    </div>
                    {log.notes && <p className="text-xs text-[var(--color-text-tertiary)] mb-2">{log.notes}</p>}
                    <div className="flex gap-1.5">
                      {REACTIONS.map(r => (
                        <button key={r.id}
                          onClick={() => sendReaction(key, r.id)}
                          className={`text-sm px-1.5 py-1 rounded-lg border transition-all ${
                            reactions[key] === r.id
                              ? 'border-[var(--ns-ember)] bg-[var(--ns-violet-light)]'
                              : 'border-[var(--color-border)] bg-white'
                          }`}
                          title={r.label}
                        >
                          {r.emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* ── COMMS TAB ── */}
        {tab === 'comms' && (
          <div className="space-y-4">
            {/* Message thread */}
            <div className="rounded-2xl p-4 space-y-3 max-h-96 overflow-y-auto" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              {messages.length === 0 ? (
                <p className="text-xs text-center py-4" style={{ color: 'var(--color-text-tertiary)' }}>No messages yet</p>
              ) : (
                [...messages].reverse().map((msg, i) => {
                  const isCoach = msg.sender_id === coachId
                  const time    = new Date(msg.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                  return (
                    <div key={i} className={`flex gap-2 ${isCoach ? 'flex-row-reverse' : ''}`}>
                      <div className="max-w-[80%] space-y-1">
                        <div className={`rounded-2xl px-3 py-2 ${isCoach ? 'rounded-tr-sm' : 'rounded-tl-sm'}`}
                          style={isCoach
                            ? { background: '#1e3a5f', color: '#e8f5ee' }
                            : { background: 'var(--color-surface-2)', color: 'var(--color-text-primary)' }}>
                          <p className="text-xs leading-relaxed">{msg.body}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-[9px] opacity-60">{time}</p>
                            {isCoach && msg.read_at && (
                              <p className="text-[9px] opacity-60">Read {new Date(msg.read_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</p>
                            )}
                            {isCoach && msg.reaction && (
                              <span className="text-sm">{msg.reaction}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Compose */}
            {sentMsg ? (
              <div className="rounded-2xl px-4 py-3 text-center" style={{ background: '#8b5cf620', border: '1px solid #8b5cf640' }}>
                <p className="text-sm font-bold" style={{ color: '#4ade80' }}>Message sent ✓</p>
              </div>
            ) : (
              <div className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>New message</p>
                  {isCoachPro && (
                    <button onClick={() => setShowSchedule(s => !s)}
                      className="text-xs px-2.5 py-1 rounded-lg font-bold transition-all"
                      style={{ background: showSchedule ? '#1e3a5f' : 'var(--color-surface-2)', color: showSchedule ? '#7eb8e8' : 'var(--color-text-tertiary)' }}>
                      📅 Schedule
                    </button>
                  )}
                </div>
                <textarea
                  value={messageBody}
                  onChange={e => setMessageBody(e.target.value)}
                  placeholder="Write a coaching note…"
                  rows={3}
                  className="w-full text-sm rounded-xl px-3 py-2.5 outline-none resize-none"
                  style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
                />
                {/* Quick templates */}
                <div className="flex flex-wrap gap-1.5">
                  {['Great session today 🔥', 'Brilliant consistency this week', 'Keep easy runs genuinely easy', 'Rest up — big session tomorrow'].map(t => (
                    <button key={t} onClick={() => setMessageBody(t)}
                      className="text-[10px] px-2 py-1 rounded-lg transition-all"
                      style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}>
                      {t}
                    </button>
                  ))}
                </div>

                {/* Schedule panel — Coach Pro */}
                {showSchedule && (
                  <div className="rounded-xl p-3 space-y-2" style={{ background: '#1e3a5f20', border: '1px solid #1e3a5f40' }}>
                    <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#7eb8e8' }}>📅 Schedule for later</p>
                    <div className="grid grid-cols-2 gap-2">
                      <input type="date" value={schedDate} onChange={e => setSchedDate(e.target.value)}
                        min={new Date().toISOString().slice(0,10)}
                        className="px-2 py-1.5 rounded-lg text-xs outline-none"
                        style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }} />
                      <input type="time" value={schedTime} onChange={e => setSchedTime(e.target.value)}
                        className="px-2 py-1.5 rounded-lg text-xs outline-none font-data"
                        style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }} />
                    </div>
                    <button onClick={async () => {
                      if (!messageBody.trim() || !schedDate) return
                      setScheduling(true)
                      try {
                        const iso = new Date(`${schedDate}T${schedTime}:00`).toISOString()
                        const res = await fetch('/api/coach/scheduled-messages', {
                          method: 'POST', headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ athlete_id: athleteId, body: messageBody, scheduled_at: iso }),
                        })
                        if (res.ok) {
                          const d = await res.json()
                          setScheduledMsgs(prev => [...prev, d.scheduled])
                          setMessageBody(''); setSchedDate(''); setShowSchedule(false)
                        }
                      } finally { setScheduling(false) }
                    }} disabled={scheduling || !schedDate || !messageBody.trim()}
                      className="w-full py-2 rounded-lg text-xs font-bold text-white disabled:opacity-40"
                      style={{ background: '#1e3a5f' }}>
                      {scheduling ? 'Scheduling…' : 'Schedule message'}
                    </button>
                  </div>
                )}

                {!isCoachPro && (
                  <p className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>
                    💡 <a href="/coach/settings" style={{ color: '#7eb8e8' }}>Upgrade to Coach Pro</a> to schedule messages for race day, post-race check-ins, and plan milestones.
                  </p>
                )}

                <button
                  onClick={sendMessage}
                  disabled={sendingMsg || !messageBody.trim()}
                  className="w-full py-3 rounded-2xl text-white text-sm font-bold disabled:opacity-40 transition-all active:scale-95"
                  style={{ background: '#8b5cf6' }}
                >
                  {sendingMsg ? 'Sending…' : 'Send message'}
                </button>
              </div>
            )}

            {/* Scheduled messages queue */}
            {isCoachPro && (
              <div>
                <button onClick={async () => {
                  if (scheduledLoaded) return
                  const res = await fetch(`/api/coach/scheduled-messages?athlete_id=${athleteId}`)
                  const d = await res.json()
                  setScheduledMsgs(d.scheduled ?? [])
                  setScheduledLoaded(true)
                }} className="text-xs font-bold mb-2 flex items-center gap-1"
                  style={{ color: 'var(--color-text-tertiary)' }}>
                  📅 Scheduled messages {scheduledMsgs.length > 0 ? `(${scheduledMsgs.length})` : ''}
                </button>
                {scheduledLoaded && scheduledMsgs.length === 0 && (
                  <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>No scheduled messages</p>
                )}
                <div className="space-y-2">
                  {scheduledMsgs.map(s => (
                    <div key={s.id} className="rounded-xl px-3 py-2.5 flex items-start justify-between gap-2"
                      style={{ background: '#1e3a5f15', border: '1px solid #1e3a5f30' }}>
                      <div className="min-w-0">
                        <p className="text-xs line-clamp-1" style={{ color: 'var(--color-text-primary)' }}>{s.body}</p>
                        <p className="text-[10px] mt-0.5" style={{ color: '#7eb8e8' }}>
                          📅 {new Date(s.scheduled_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <button onClick={async () => {
                        await fetch(`/api/coach/scheduled-messages?id=${s.id}`, { method: 'DELETE' })
                        setScheduledMsgs(prev => prev.filter(m => m.id !== s.id))
                      }} className="text-[10px] px-2 py-0.5 rounded flex-shrink-0"
                        style={{ background: '#ff4d6d15', color: '#ff4d6d' }}>
                        Cancel
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
