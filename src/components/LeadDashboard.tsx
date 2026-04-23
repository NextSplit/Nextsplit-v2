'use client'

/**
 * LeadDashboard — Product & UX Pillar spec (Chapter 9):
 * "Replaces the Today tab content in Split Leader mode.
 *  Shows only what needs attention: athletes who missed sessions today,
 *  athletes in their peak week, load risk flags, weekly completion overview.
 *  Clean dashboard standard: if everyone is logging, dashboard is nearly empty."
 */

import { useState, useEffect } from 'react'
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
  plan_name:           string | null
  current_week:        number | null
  total_weeks:         number | null
  runner_class:        string | null
}

interface Props {
  onExitLeadMode: () => void
  athleteCount:   number
  isSplitLeader:  boolean
}

const MAX_SPLIT_LEADER_ATHLETES = 5

export default function LeadDashboard({ onExitLeadMode, athleteCount, isSplitLeader }: Props) {
  const [athletes, setAthletes]   = useState<AthleteStatus[]>([])
  const [loading, setLoading]     = useState(true)
  const [inviteUrl, setInviteUrl] = useState('')
  const [showInvite, setShowInvite] = useState(false)

  useEffect(() => {
    fetch('/api/coach/squad-status')
      .then(r => r.json())
      .then(d => { setAthletes(d.athletes ?? []) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function generateInvite() {
    try {
      const res  = await fetch('/api/coach/invite', { method: 'POST' })
      const data = await res.json()
      if (data.inviteUrl) {
        setInviteUrl(data.inviteUrl)
        setShowInvite(true)
      }
    } catch { /* ignore */ }
  }

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(inviteUrl)
    } catch { /* ignore */ }
  }

  // Spec: "clean dashboard standard — if all athletes logging, dashboard nearly empty"
  const needAttention = athletes.filter(a => a.status !== 'green')
  const onTrack       = athletes.filter(a => a.status === 'green')
  const atCap         = isSplitLeader && athleteCount >= MAX_SPLIT_LEADER_ATHLETES

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-6 h-6 rounded-full border-2 border-gray-100 border-t-[var(--ns-forest)] animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Lead mode banner — spec: "persistent indicator, impossible to confuse which mode" */}
      <div className="rounded-2xl p-4 flex items-center justify-between"
        style={{ background: 'var(--ns-forest)', color: 'white' }}>
        <div>
          <p className="text-xs font-bold opacity-60 uppercase tracking-wider mb-0.5">
            {isSplitLeader ? 'Split Leader' : 'Coach'} mode
          </p>
          <p className="text-sm font-bold">
            {athletes.length} athlete{athletes.length !== 1 ? 's' : ''} in your squad
          </p>
        </div>
        <button
          onClick={onExitLeadMode}
          className="text-xs font-bold px-3 py-1.5 rounded-xl bg-white/20 active:bg-white/30 transition-all"
        >
          Back to my training →
        </button>
      </div>

      {/* At-cap warning */}
      {atCap && (
        <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 flex items-start gap-2">
          <span className="text-base mt-0.5">⚠️</span>
          <div>
            <p className="text-xs font-bold text-amber-800 mb-0.5">
              Squad is full — {MAX_SPLIT_LEADER_ATHLETES}/{MAX_SPLIT_LEADER_ATHLETES} athletes
            </p>
            <p className="text-xs text-amber-700 leading-relaxed">
              Split Leader supports up to {MAX_SPLIT_LEADER_ATHLETES} athletes.
              Upgrade to Pro Coach to expand your squad and unlock marketplace selling.
            </p>
          </div>
        </div>
      )}

      {/* Empty state — spec: "clean dashboard is a good dashboard" */}
      {athletes.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
          <div className="text-3xl mb-3">👥</div>
          <h3 className="text-sm font-bold text-gray-900 mb-1">No athletes yet</h3>
          <p className="text-xs text-gray-400 mb-4 leading-relaxed">
            Invite runners to your squad. They'll need a free NextSplit account.
          </p>
          {!atCap && (
            <button
              onClick={generateInvite}
              className="text-xs font-bold px-4 py-2 rounded-xl text-white"
              style={{ background: 'var(--ns-forest)' }}
            >
              Generate invite link →
            </button>
          )}
        </div>
      )}

      {/* Clean state — everyone on track */}
      {athletes.length > 0 && needAttention.length === 0 && (
        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl px-4 py-4 flex items-center gap-3">
          <span className="text-2xl">✓</span>
          <div>
            <p className="text-sm font-bold text-emerald-800">All athletes on track today</p>
            <p className="text-xs text-emerald-600 mt-0.5">
              {onTrack.length} runner{onTrack.length !== 1 ? 's' : ''} logging consistently.
              Nothing needs your attention right now.
            </p>
          </div>
        </div>
      )}

      {/* Needs attention — spec: "only show what needs attention" */}
      {needAttention.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">
            Needs attention ({needAttention.length})
          </p>
          {needAttention.map(a => (
            <AthleteCard key={a.athlete_id} athlete={a} />
          ))}
        </div>
      )}

      {/* On track — collapsed summary */}
      {onTrack.length > 0 && needAttention.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 px-4 py-3 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            <span className="font-bold text-emerald-600">{onTrack.length} on track</span>
            {' — no action needed'}
          </p>
          <div className="flex gap-1">
            {onTrack.map(a => {
              const cls = a.runner_class ? RUNNER_CLASSES[a.runner_class as RunnerClassId] : null
              return (
                <div key={a.athlete_id} className="w-7 h-7 rounded-full bg-emerald-50 flex items-center justify-center text-sm"
                  title={a.display_name ?? 'Athlete'}>
                  {cls?.emoji ?? '🏃'}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Weekly completion strip */}
      {athletes.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">
            This week
          </p>
          <div className="space-y-2">
            {athletes.map(a => {
              const done  = a.sessions_done_week
              const total = a.sessions_total_week || 0
              const pct   = total > 0 ? (done / total) * 100 : 0
              const name  = a.display_name ?? (a.handle ? `@${a.handle}` : 'Athlete')
              const cls   = a.runner_class ? RUNNER_CLASSES[a.runner_class as RunnerClassId] : null
              return (
                <a key={a.athlete_id} href={`/coach/athlete/${a.athlete_id}`}
                  className="flex items-center gap-3 group">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-sm flex-shrink-0"
                    style={{ background: 'var(--ns-forest-light)' }}>
                    {cls?.emoji ?? '🏃'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="text-xs font-semibold text-gray-800 truncate group-hover:underline">{name}</p>
                      <p className="text-[10px] text-gray-400 flex-shrink-0 ml-2">{done}/{total}</p>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all"
                        style={{
                          width: `${pct}%`,
                          background: pct >= 100 ? '#10b981' : pct >= 60 ? 'var(--ns-forest)' : '#f59e0b',
                        }} />
                    </div>
                  </div>
                </a>
              )
            })}
          </div>
        </div>
      )}

      {/* Invite button */}
      {athletes.length > 0 && !atCap && (
        <button
          onClick={generateInvite}
          className="w-full py-3 rounded-2xl border-2 border-dashed border-gray-200 text-xs font-bold text-gray-400 active:border-[var(--ns-forest)] active:text-[var(--ns-forest)] transition-all"
        >
          + Invite another runner ({athleteCount}/{isSplitLeader ? MAX_SPLIT_LEADER_ATHLETES : '∞'})
        </button>
      )}

      {/* Invite modal */}
      {showInvite && inviteUrl && (
        <>
          <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setShowInvite(false)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl max-w-lg mx-auto px-5 pt-5 pb-8">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
            <h3 className="text-base font-bold text-gray-900 mb-2">Share this link</h3>
            <p className="text-xs text-gray-400 mb-4 leading-relaxed">
              Each link is single-use and expires in 7 days. Generate a new one for each athlete.
            </p>
            <div className="bg-gray-50 rounded-xl px-4 py-3 flex items-center gap-3 mb-4">
              <p className="text-xs text-gray-600 font-mono flex-1 truncate">{inviteUrl}</p>
              <button onClick={copyInvite}
                className="text-xs font-bold flex-shrink-0"
                style={{ color: 'var(--ns-forest)' }}>
                Copy
              </button>
            </div>
            <button onClick={() => setShowInvite(false)}
              className="w-full py-3 rounded-2xl border border-gray-200 text-sm font-semibold text-gray-600">
              Done
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function AthleteCard({ athlete }: { athlete: AthleteStatus }) {
  const name = athlete.display_name ?? (athlete.handle ? `@${athlete.handle}` : 'Athlete')
  const cls  = athlete.runner_class ? RUNNER_CLASSES[athlete.runner_class as RunnerClassId] : null
  const statusColour = athlete.status === 'red' ? '#ef4444' : '#f59e0b'
  const daysSince = athlete.last_active
    ? Math.floor((new Date().getTime() - new Date(athlete.last_active).getTime()) / (24 * 3600 * 1000))
    : null

  return (
    <a href={`/coach/athlete/${athlete.athlete_id}`}
      className="block bg-white rounded-2xl border-2 overflow-hidden active:scale-[0.98] transition-all"
      style={{ borderColor: statusColour + '40' }}>
      <div className="flex items-center gap-3 px-4 py-3.5">
        {/* Character emoji with status indicator */}
        <div className="relative shrink-0">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
            style={{ background: 'var(--ns-forest-light)' }}>
            {cls?.emoji ?? '🏃'}
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white"
            style={{ background: statusColour }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900 truncate">{name}</p>
          {athlete.flags.length > 0 && (
            <p className="text-xs text-gray-400 truncate mt-0.5">{athlete.flags[0]}</p>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs font-bold text-gray-700">
            {athlete.sessions_done_week}/{athlete.sessions_total_week || '?'}
          </p>
          <p className="text-[9px] text-gray-400">sessions</p>
        </div>
      </div>
      {/* ACWR + last active */}
      <div className="grid grid-cols-2 divide-x divide-gray-50 border-t border-gray-50">
        <div className="px-4 py-2 text-center">
          <p className="text-xs font-bold" style={{
            color: athlete.acwr === null ? '#9ca3af'
              : athlete.acwr > 1.3 ? '#ef4444'
              : athlete.acwr < 0.8 ? '#f59e0b' : '#10b981',
          }}>
            {athlete.acwr?.toFixed(2) ?? '—'}
          </p>
          <p className="text-[9px] text-gray-400">ACWR</p>
        </div>
        <div className="px-4 py-2 text-center">
          <p className="text-xs font-bold text-gray-700">
            {daysSince === null ? '—' : daysSince === 0 ? 'Today' : `${daysSince}d ago`}
          </p>
          <p className="text-[9px] text-gray-400">last active</p>
        </div>
      </div>
    </a>
  )
}
