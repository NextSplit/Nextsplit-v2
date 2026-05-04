'use client'

import { useMemo } from 'react'
import type { TrainingLog } from '@/types/database'

interface Props {
  logs: TrainingLog[]
}

const ZONES = [
  { id: 'easy',     label: 'Zone 2 · Easy',     colour: '#00e676', desc: 'Conversational pace · fat burning' },
  { id: 'tempo',    label: 'Zone 3-4 · Tempo',   colour: '#ffb800', desc: 'Controlled hard · lactate threshold' },
  { id: 'interval', label: 'Zone 5 · Intervals', colour: '#ff7438', desc: 'Maximum effort · VO2max' },
  { id: 'long',     label: 'Long Run',            colour: '#4d8aff', desc: 'Aerobic base building' },
  { id: 'gym',      label: 'Strength',            colour: '#a855f7', desc: 'Injury prevention · power' },
]

function classifySession(code: string | null | undefined): string {
  const c = (code ?? '').toLowerCase()
  if (c.includes('tempo'))                           return 'tempo'
  if (c.includes('interval') || c.includes('speed')) return 'interval'
  if (c.includes('long'))                            return 'long'
  if (c.includes('gym') || c.includes('strength'))   return 'gym'
  return 'easy'
}

export default function TrainingZonesChart({ logs }: Props) {
  const zones = useMemo(() => {
    const counts: Record<string, { sessions: number; km: number }> = {}
    ZONES.forEach(z => { counts[z.id] = { sessions: 0, km: 0 } })

    logs.filter(l => l.done).forEach(log => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const code = (log as any).session_code ?? (log as any).type ?? null
      const zone = classifySession(code)
      if (counts[zone]) {
        counts[zone].sessions++
        counts[zone].km += log.km ?? 0
      } else {
        counts.easy.sessions++
        counts.easy.km += log.km ?? 0
      }
    })

    const totalSessions = Object.values(counts).reduce((s, z) => s + z.sessions, 0)
    return ZONES.map(z => ({
      ...z,
      sessions: counts[z.id].sessions,
      km: Math.round(counts[z.id].km * 10) / 10,
      pct: totalSessions > 0 ? counts[z.id].sessions / totalSessions : 0,
    })).sort((a, b) => b.sessions - a.sessions)
  }, [logs])

  const totalSessions = zones.reduce((s, z) => s + z.sessions, 0)
  const totalKm       = zones.reduce((s, z) => s + z.km, 0)

  // Training balance assessment
  const easyPct = zones.find(z => z.id === 'easy')?.pct ?? 0
  const balance = easyPct >= 0.7
    ? { msg: '80/20 balance ✓', colour: '#00e676' }
    : easyPct >= 0.5
      ? { msg: 'Slightly intensity-heavy', colour: '#ffb800' }
      : { msg: 'Too much intensity — add easy runs', colour: '#ff3d6e' }

  if (totalSessions === 0) {
    return (
      <div className="rounded-3xl p-6 text-center"
        style={{ background: 'var(--color-surface)', border: '2.5px solid var(--color-border-2)' }}>
        <div className="text-3xl mb-2">📊</div>
        <p className="font-black" style={{ color: 'var(--color-text-primary)' }}>Stats unlock after 4 sessions</p>
        <p className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
          Log more sessions to see your training zone breakdown.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-3xl overflow-hidden"
      style={{ background: 'var(--color-surface)', border: '2.5px solid var(--color-border-2)' }}>

      {/* Header */}
      <div className="px-5 pt-5 pb-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest mb-0.5"
              style={{ color: 'var(--color-text-tertiary)' }}>Training zones</p>
            <p className="text-2xl font-black" style={{ color: 'var(--color-text-primary)', letterSpacing: '-0.03em' }}>
              {totalSessions} sessions · {totalKm.toFixed(0)}km
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-black" style={{ color: balance.colour }}>{balance.msg}</p>
          </div>
        </div>
      </div>

      {/* Donut chart */}
      <div className="px-5 py-4">
        <div className="relative w-32 h-32 mx-auto mb-4">
          <svg width={128} height={128} viewBox="0 0 128 128" style={{ transform: 'rotate(-90deg)' }}>
            {(() => {
              let offset = 0
              const circ = 2 * Math.PI * 50
              return zones.map(z => {
                const dash = z.pct * circ
                const el = (
                  <circle key={z.id}
                    cx={64} cy={64} r={50}
                    fill="none" stroke={z.colour} strokeWidth={24}
                    strokeDasharray={`${dash - 2} ${circ - dash + 2}`}
                    strokeDashoffset={-offset}
                    strokeLinecap="butt" />
                )
                offset += dash
                return el
              })
            })()}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-xl font-black" style={{ color: 'var(--color-text-primary)' }}>{totalSessions}</p>
            <p className="text-[9px] font-bold" style={{ color: 'var(--color-text-tertiary)' }}>sessions</p>
          </div>
        </div>

        {/* Zone bars */}
        <div className="space-y-3">
          {zones.filter(z => z.sessions > 0).map(z => (
            <div key={z.id}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: z.colour }} />
                  <span className="text-xs font-black" style={{ color: 'var(--color-text-primary)' }}>{z.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>{z.km}km</span>
                  <span className="text-xs font-black" style={{ color: z.colour }}>
                    {Math.round(z.pct * 100)}%
                  </span>
                </div>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--color-surface-2)' }}>
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${z.pct * 100}%`, background: z.colour, boxShadow: `0 0 6px ${z.colour}60` }} />
              </div>
              <p className="text-[9px] mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>{z.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
