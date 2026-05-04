'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Props {
  profile: { id: string; display_name: string; handle: string | null; runner_class: string | null; runner_colour: string; bio: string | null; is_split_leader: boolean }
  plan:    { name: string; goal: string | null; race_date: string | null; current_week: number; total_weeks: number; plan_type: string } | null
  logs:    { done: boolean; km: number | null; effort: number | null; created_at: string; week_n: number }[]
  viewerId: string
}

function daysUntil(date: string) {
  return Math.ceil((new Date(date).getTime() - Date.now()) / 86400000)
}

export default function MemberProfileClient({ profile, plan, logs, viewerId }: Props) {
  const router = useRouter()
  const colour = profile.runner_colour ?? '#06b6d4'
  const isSelf = profile.id === viewerId

  // Compute stats
  const weeklyKm = logs.filter(l => {
    const d = new Date(l.created_at)
    const monday = new Date(); monday.setDate(monday.getDate() - (monday.getDay() === 0 ? 6 : monday.getDay() - 1)); monday.setHours(0,0,0,0)
    return d >= monday
  }).reduce((s, l) => s + (l.km ?? 0), 0)

  const monthlyKm = logs.reduce((s, l) => s + (l.km ?? 0), 0)
  const avgEffort = logs.filter(l => l.effort).length
    ? (logs.filter(l => l.effort).reduce((s, l) => s + (l.effort ?? 0), 0) / logs.filter(l => l.effort).length).toFixed(1)
    : null

  // Last 7 days activity heatmap
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i))
    const key = d.toISOString().slice(0, 10)
    const dayLogs = logs.filter(l => l.created_at.startsWith(key))
    const km = dayLogs.reduce((s, l) => s + (l.km ?? 0), 0)
    return { key, km, done: dayLogs.length > 0 }
  })

  const planPct = plan ? plan.current_week / plan.total_weeks : 0

  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--color-bg)' }}>
      {/* Background colour wash */}
      <div className="fixed inset-0 pointer-events-none opacity-15"
        style={{ background: `radial-gradient(ellipse at 50% 0%, ${colour} 0%, transparent 60%)` }} />

      {/* Header */}
      <div className="sticky top-0 z-40 border-b"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <div className="max-w-lg mx-auto px-4 pt-12 pb-3 flex items-center gap-3">
          <button onClick={() => router.back()} aria-label="Back"
            className="w-8 h-8 flex items-center justify-center rounded-full flex-shrink-0"
            style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-secondary)' }}>←</button>
          <div className="flex-1 min-w-0">
            <p className="text-base font-black truncate" style={{ color: 'var(--color-text-primary)' }}>
              {profile.display_name}
              {profile.is_split_leader && <span className="ml-1.5 text-sm">👑</span>}
            </p>
            {profile.handle && (
              <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>@{profile.handle}</p>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-5 space-y-3">
        {/* Runner avatar + class */}
        <div className="rounded-2xl p-5 flex items-center gap-4"
          style={{ background: `${colour}12`, border: `1.5px solid ${colour}35` }}>
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-black flex-shrink-0"
            style={{ background: `${colour}25`, border: `3px solid ${colour}`, color: colour }}>
            {profile.display_name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: colour }}>
              {profile.runner_class ?? 'Runner'}
            </p>
            <p className="text-xl font-black leading-tight" style={{ color: 'var(--color-text-primary)', letterSpacing: '-0.02em' }}>
              {profile.display_name}
            </p>
            {profile.bio && (
              <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--color-text-tertiary)' }}>{profile.bio}</p>
            )}
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { value: `${weeklyKm.toFixed(1)}`, label: 'km this week', colour: '#2563eb' },
            { value: `${monthlyKm.toFixed(1)}`, label: 'km this month', colour: colour },
            { value: avgEffort ? `RPE ${avgEffort}` : '—', label: 'avg effort', colour: '#f0a500' },
          ].map(s => (
            <div key={s.label} className="rounded-xl py-3 text-center"
              style={{ background: `${s.colour}10`, border: `1px solid ${s.colour}25` }}>
              <p className="text-lg font-black" style={{ color: s.colour }}>{s.value}</p>
              <p className="text-[9px] mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* 7-day activity heatmap */}
        <div className="rounded-2xl p-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <p className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: 'var(--color-text-tertiary)' }}>
            Last 7 days
          </p>
          <div className="flex gap-2">
            {last7.map(day => (
              <div key={day.key} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full rounded-lg transition-all"
                  style={{
                    height: 40,
                    background: day.done ? `${colour}${Math.min(Math.round(day.km / 15 * 255), 255).toString(16).padStart(2, '0')}` : 'rgba(255,255,255,0.04)',
                    border: day.done ? `1px solid ${colour}40` : '1px solid rgba(255,255,255,0.06)',
                    minHeight: day.done ? 12 : 40,
                  }} />
                <p className="text-[8px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
                  {new Date(day.key).toLocaleDateString('en-GB', { weekday: 'narrow' })}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Active plan */}
        {plan && (
          <div className="rounded-2xl p-4" style={{ background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.2)' }}>
            <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: '#2563eb' }}>
              Active plan
            </p>
            <p className="text-base font-black mb-1" style={{ color: 'var(--color-text-primary)' }}>{plan.name}</p>
            {plan.goal && (
              <p className="text-xs mb-2" style={{ color: 'var(--color-text-tertiary)' }}>🎯 {plan.goal}</p>
            )}
            <div className="flex items-center gap-3 mb-2">
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Week {plan.current_week} of {plan.total_weeks}
              </p>
              {plan.race_date && (
                <p className="text-xs" style={{ color: '#ff4d6d' }}>
                  🏁 {daysUntil(plan.race_date)}d to race
                </p>
              )}
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${planPct * 100}%`, background: '#2563eb' }} />
            </div>
          </div>
        )}

        {/* Nudge button (only for leaders and for non-self) */}
        {!isSelf && (
          <button className="w-full py-3.5 rounded-2xl font-black text-sm"
            style={{ background: `${colour}15`, border: `1.5px solid ${colour}35`, color: colour }}>
            👋 Send a nudge
          </button>
        )}
      </div>
    </div>
  )
}
