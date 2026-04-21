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
  green: { dot: 'bg-emerald-400', ring: 'border-gray-200',  badge: 'bg-emerald-100 text-emerald-700', label: 'On track'  },
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
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto" />
        <h2 className="text-base font-black text-gray-900">Invite an athlete</h2>
        <p className="text-sm text-gray-500">Each link is single-use and expires in 7 days. Generate a new one for each athlete.</p>
        {!inviteUrl ? (
          <button onClick={generate} disabled={loading}
            className="w-full text-white py-4 rounded-2xl text-sm font-bold disabled:opacity-50 active:scale-95"
            style={{ background: 'var(--ns-forest)' }}>
            {loading ? 'Generating…' : 'Generate invite link →'}
          </button>
        ) : (
          <div className="space-y-3">
            <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-600 font-mono break-all border border-gray-200">{inviteUrl}</div>
            <button onClick={copy} className={`w-full py-4 rounded-2xl text-sm font-bold text-white transition-all`}
              style={{ background: copied ? '#10b981' : 'var(--ns-forest)' }}>
              {copied ? '✓ Copied to clipboard!' : 'Copy invite link'}
            </button>
            <button onClick={generate} className="w-full py-2 text-xs text-gray-400">Generate another link</button>
          </div>
        )}
        <button onClick={onClose} className="w-full text-gray-400 text-sm py-2">Close</button>
      </div>
    </>
  )
}

function BroadcastModal({ onClose, athleteCount }: { onClose: () => void; athleteCount: number }) {
  const [body, setBody]     = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent]     = useState(false)

  const TEMPLATES = [
    'Great training week everyone — keep it up 💪',
    'Remember: easy runs should feel genuinely easy. If you can\'t hold a conversation, slow down.',
    'Race season is coming — make sure you\'re logging your wellness each morning.',
    'Big week ahead. Prioritise sleep and stay hydrated.',
    'Check in with me if you\'re feeling any niggles — catch them early.',
  ]

  const send = async () => {
    if (!body.trim()) return
    setSending(true)
    try {
      await fetch('/api/coach/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      })
      setSent(true)
      setTimeout(() => { setSent(false); onClose() }, 2000)
    } finally { setSending(false) }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl p-6 space-y-4 max-w-lg mx-auto">
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto" />
        <div>
          <h2 className="text-base font-black text-gray-900">Message all athletes</h2>
          <p className="text-xs text-gray-400 mt-0.5">Sends to all {athleteCount} active athlete{athleteCount !== 1 ? 's' : ''}</p>
        </div>

        {sent ? (
          <div className="py-6 text-center">
            <p className="text-2xl mb-2">✓</p>
            <p className="text-sm font-bold text-emerald-700">Sent to {athleteCount} athlete{athleteCount !== 1 ? 's' : ''}</p>
          </div>
        ) : (
          <>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Write your squad message…"
              rows={3}
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none resize-none"
              style={{ outlineColor: 'var(--ns-forest)' }}
            />
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Quick templates</p>
              {TEMPLATES.map(t => (
                <button key={t} onClick={() => setBody(t)}
                  className="w-full text-left text-xs px-3 py-2 rounded-xl bg-gray-50 border border-gray-100 text-gray-600 hover:border-gray-200">
                  {t}
                </button>
              ))}
            </div>
            <button onClick={send} disabled={sending || !body.trim()}
              className="w-full py-3 rounded-2xl text-white text-sm font-bold disabled:opacity-40"
              style={{ background: 'var(--ns-forest)' }}>
              {sending ? 'Sending…' : `Send to ${athleteCount} athlete${athleteCount !== 1 ? 's' : ''}`}
            </button>
          </>
        )}
        <button onClick={onClose} className="w-full text-gray-400 text-sm py-2">Close</button>
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
      <a href={`/coach/athlete/${athlete.athlete_id}`} className="flex items-center gap-3 px-4 py-3.5 active:bg-[#f8f8f6]">
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
            <p className="text-sm font-bold text-gray-900 truncate">{name}</p>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${cfg.badge}`}>
              {cfg.label}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            {athlete.plan_name && (
              <p className="text-xs text-gray-400 truncate">
                {athlete.plan_name} · W{athlete.current_week}/{athlete.total_weeks}
              </p>
            )}
            {cls && (
              <>
                {athlete.plan_name && <span className="text-[10px] text-gray-300">·</span>}
                <span className="text-[10px] text-gray-400 shrink-0">{cls.name}</span>
              </>
            )}
          </div>
        </div>

        <span className="text-gray-300 text-lg shrink-0">›</span>
      </a>

      {/* Stats strip */}
      <div className="grid grid-cols-3 divide-x divide-gray-100 border-t border-gray-100">
        <div className="px-3 py-2 text-center">
          <p className="text-xs font-black text-gray-800">
            {athlete.sessions_done_week}/{athlete.sessions_total_week || '?'}
          </p>
          <p className="text-[9px] text-gray-400">sessions</p>
        </div>
        <div className={`px-3 py-2 text-center ${
          athlete.acwr === null ? '' :
          athlete.acwr > 1.3 ? 'bg-red-900/20' :
          athlete.acwr < 0.8 ? 'bg-amber-900/20' : 'bg-emerald-900/20'
        }`}>
          <p className={`text-xs font-black ${
            athlete.acwr === null ? 'text-gray-400' :
            athlete.acwr > 1.3 ? 'text-red-700' :
            athlete.acwr < 0.8 ? 'text-amber-700' : 'text-emerald-700'
          }`}>
            {athlete.acwr?.toFixed(2) ?? '—'}
          </p>
          <p className="text-[9px] text-gray-400">ACWR</p>
        </div>
        <div className="px-3 py-2 text-center">
          <p className="text-xs font-black text-gray-800">
            {daysSince === null ? '—' : daysSince === 0 ? 'Today' : `${daysSince}d`}
          </p>
          <p className="text-[9px] text-gray-400">last active</p>
        </div>
      </div>

      {/* Flags — only if red/amber */}
      {athlete.flags.length > 0 && (
        <div className="px-4 pb-3 pt-1 space-y-1">
          {athlete.flags.map(f => (
            <div key={f} className="flex items-center gap-2 text-xs text-amber-400 bg-amber-900/20 rounded-lg px-2.5 py-1.5">
              <span>{f}</span>
            </div>
          ))}
        </div>
      )}

      {/* Quick actions — message */}
      <div className="px-4 pb-3 flex gap-2">
        <button
          onClick={() => onMessage(athlete.athlete_id)}
          className="flex-1 bg-gray-100 text-gray-700 text-xs font-semibold py-2 rounded-xl active:bg-gray-200"
        >
          💬 Message
        </button>
        <a
          href={`/coach/athlete/${athlete.athlete_id}`}
          className="flex-1 bg-[var(--ns-forest-light)] text-[var(--ns-forest)] text-xs font-semibold py-2 rounded-xl text-center active:bg-[var(--ns-forest-light)]"
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
  const [showBroadcast, setShowBroadcast] = useState(false)

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

  const needsAttention = athletes.filter(a => a.status !== 'green')
  const onTrack        = athletes.filter(a => a.status === 'green')
  const today          = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })

  const handleMessage = (athleteId: string) => {
    window.location.href = `/coach/athlete/${athleteId}?tab=message`
  }

  return (
    <div className="min-h-screen pb-28" style={{ background: '#f8f8f6' }}>

      {/* Command centre header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-4 sticky top-0 z-40">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-1">
            <div>
              <h1 className="text-lg font-black text-gray-900">Squad</h1>
              <p className="text-xs text-gray-400">{today}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={fetchStatus} className="text-gray-400 text-lg px-1.5">↻</button>
              {athletes.length > 0 && (
                <button
                  onClick={() => setShowBroadcast(true)}
                  className="text-gray-600 text-sm font-bold px-3 py-2 rounded-xl border border-gray-200 active:bg-gray-50"
                >
                  📢
                </button>
              )}
              <button
                onClick={() => setShowInvite(true)}
                className="text-white text-sm font-bold px-4 py-2 rounded-xl active:scale-95"
                style={{ background: 'var(--ns-forest)' }}
              >
                + Invite
              </button>
            </div>
          </div>

          {/* At-a-glance strip */}
          {!loading && athletes.length > 0 && (
            <div className="flex items-center gap-3 mt-2">
              {needsAttention.length > 0 && (
                <span className="text-[11px] font-bold text-red-400 bg-red-900/20 px-2 py-1 rounded-lg">
                  {needsAttention.length} need{needsAttention.length === 1 ? 's' : ''} attention
                </span>
              )}
              {onTrack.length > 0 && (
                <span className="text-[11px] font-semibold text-emerald-600">
                  {onTrack.length} on track ✓
                </span>
              )}
              <span className="text-[11px] text-gray-400 ml-auto">{athletes.length} athlete{athletes.length !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4 space-y-4">

        {/* Loading */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-28 bg-white rounded-2xl border border-gray-100 animate-pulse" />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && athletes.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
            <div className="text-4xl mb-3">👥</div>
            <h3 className="text-sm font-bold text-gray-900 mb-1">No athletes yet</h3>
            <p className="text-xs text-gray-400 mb-4">Invite runners to your squad to start coaching.</p>
            <button
              onClick={() => setShowInvite(true)}
              className="text-xs font-bold px-4 py-2 rounded-xl text-white"
              style={{ background: 'var(--ns-forest)' }}
            >
              Generate invite link →
            </button>
          </div>
        )}

        {/* NEEDS ATTENTION — top priority, always first */}
        {!loading && needsAttention.length > 0 && (
          <section>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1 mb-2">
              Needs attention ({needsAttention.length})
            </p>
            <div className="space-y-3">
              {needsAttention.map(athlete => (
                <AthleteCard key={athlete.athlete_id} athlete={athlete} onMessage={handleMessage} />
              ))}
            </div>
          </section>
        )}

        {/* ON TRACK — collapsed if any need attention, expanded if clean */}
        {!loading && onTrack.length > 0 && (
          <section>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1 mb-2">
              {needsAttention.length > 0 ? `On track (${onTrack.length})` : `All on track ✓`}
            </p>

            {needsAttention.length === 0 ? (
              /* Clean dashboard — no attention needed */
              <div className="bg-emerald-900/20 rounded-2xl px-4 py-4 flex items-center gap-3" style={{ border: "1px solid rgba(16,185,129,0.2)" }}>
                <span className="text-2xl">✓</span>
                <div>
                  <p className="text-sm font-bold text-emerald-800">All {onTrack.length} athletes on track</p>
                  <p className="text-xs text-emerald-600 mt-0.5">No action needed right now.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {onTrack.map(athlete => (
                  <AthleteCard key={athlete.athlete_id} athlete={athlete} onMessage={handleMessage} />
                ))}
              </div>
            )}
          </section>
        )}

        {/* WEEKLY LOAD OVERVIEW */}
        {!loading && athletes.length > 0 && (
          <section>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1 mb-2">
              This week
            </p>
            <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
              {athletes.map(a => {
                const done  = a.sessions_done_week
                const total = a.sessions_total_week || 0
                const pct   = total > 0 ? (done / total) * 100 : 0
                const name  = a.display_name ?? (a.handle ? `@${a.handle}` : 'Athlete')
                const cls   = a.runner_class ? RUNNER_CLASSES[a.runner_class as RunnerClassId] : null
                return (
                  <a key={a.athlete_id} href={`/coach/athlete/${a.athlete_id}`}
                    className="flex items-center gap-3 group active:opacity-70">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm flex-shrink-0"
                      style={{ background: 'var(--ns-forest-light)' }}>
                      {cls?.emoji ?? '🏃'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-semibold text-gray-800 truncate group-hover:underline">{name}</p>
                        <p className="text-[10px] text-gray-400 flex-shrink-0 ml-2">
                          {done}/{total || '?'} sessions
                        </p>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(pct, 100)}%`,
                            background: pct >= 100 ? '#10b981' : pct >= 60 ? 'var(--ns-forest)' : '#f59e0b',
                          }} />
                      </div>
                    </div>
                    {a.acwr !== null && (
                      <span className={`text-[10px] font-bold flex-shrink-0 px-1.5 py-0.5 rounded-lg ${
                        a.acwr > 1.3 ? 'bg-red-900/20 text-red-400' :
                        a.acwr < 0.8 ? 'bg-amber-900/20 text-amber-400' : 'bg-emerald-900/20 text-emerald-400'
                      }`}>
                        {a.acwr.toFixed(1)}
                      </span>
                    )}
                  </a>
                )
              })}
            </div>
          </section>
        )}

        {/* COACH TOOLS */}
        <section>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1 mb-2">Tools</p>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/coach/plan-builder"
              className="bg-white rounded-2xl border border-gray-100 p-3.5 space-y-1 active:bg-gray-50">
              <span className="text-xl">📋</span>
              <p className="text-sm font-bold text-gray-800">Plan Builder</p>
              <p className="text-xs text-gray-400">Build plans for athletes</p>
            </Link>
            <Link href="/marketplace"
              className="bg-white rounded-2xl border border-gray-100 p-3.5 space-y-1 active:bg-gray-50">
              <span className="text-xl">🏪</span>
              <p className="text-sm font-bold text-gray-800">Marketplace</p>
              <p className="text-xs text-gray-400">Browse and publish plans</p>
            </Link>
            <Link href="/community"
              className="bg-white rounded-2xl border border-gray-100 p-3.5 space-y-1 active:bg-gray-50">
              <span className="text-xl">👥</span>
              <p className="text-sm font-bold text-gray-800">Community</p>
              <p className="text-xs text-gray-400">Clubs, challenges, races</p>
            </Link>
            <button
              onClick={async () => {
                try {
                  await fetch('/api/coach/apply', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tier: 'professional' }) })
                } catch { /* ignore */ }
              }}
              className="bg-white rounded-2xl border border-gray-100 p-3.5 space-y-1 text-left active:bg-gray-50">
              <span className="text-xl">⚙️</span>
              <p className="text-sm font-bold text-gray-800">Coach Settings</p>
              <p className="text-xs text-gray-400">Profile, credentials</p>
            </button>
          </div>
        </section>
      </div>

      {showInvite && <InviteModal onClose={() => setShowInvite(false)} />}
      {showBroadcast && <BroadcastModal onClose={() => setShowBroadcast(false)} athleteCount={athletes.length} />}
    </div>
  )
}
