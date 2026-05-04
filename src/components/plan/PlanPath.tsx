'use client'

import { useState, useRef, useEffect } from 'react'
import type { PlanWeek, PlanSession, TrainingLog } from '@/types/database'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  weeks:         PlanWeek[]
  currentWeekN:  number
  logs:          Record<string, TrainingLog>
  onWeekTap:     (week: PlanWeek) => void
  planName:      string
  raceDate:      string | null
}

// ── Constants ─────────────────────────────────────────────────────────────────

const WEEK_CONFIG: Record<string, { label: string; colour: string; emoji: string }> = {
  k: { label: 'Build',    colour: '#2563eb', emoji: '📈' },
  d: { label: 'Deload',   colour: '#f97316', emoji: '🔋' },
  p: { label: 'Peak',     colour: '#ef4444', emoji: '🔥' },
  r: { label: 'Race',     colour: '#ec4899', emoji: '🏁' },
  e: { label: 'Easy',     colour: '#22c55e', emoji: '🟢' },
  t: { label: 'Taper',    colour: '#8b5cf6', emoji: '⬇️' },
}

const SESSION_COLOURS: Record<string, string> = {
  easy:     '#22c55e',
  tempo:    '#eab308',
  interval: '#f97316',
  long:     '#3b82f6',
  recovery: '#4ade80',
  gym:      '#8b5cf6',
  race:     '#ec4899',
  rest:     '#6b7280',
}

function getSessionColour(code: string | undefined | null): string {
  if (!code) return SESSION_COLOURS.easy
  const c = code.toLowerCase()
  if (c.includes('tempo'))                           return SESSION_COLOURS.tempo
  if (c.includes('interval') || c.includes('speed')) return SESSION_COLOURS.interval
  if (c.includes('long'))                            return SESSION_COLOURS.long
  if (c.includes('recovery'))                        return SESSION_COLOURS.recovery
  if (c.includes('gym') || c.includes('strength'))   return SESSION_COLOURS.gym
  if (c.includes('race'))                            return SESSION_COLOURS.race
  return SESSION_COLOURS.easy
}

function getWeekConfig(b: string) {
  return WEEK_CONFIG[b] ?? WEEK_CONFIG.k
}

function getWeekSessions(week: PlanWeek): PlanSession[] {
  return week.days.flatMap(d => d.sessions ?? []).filter(s => s.c && s.c !== 'rest')
}

function getWeekKm(week: PlanWeek): number {
  return getWeekSessions(week).reduce((s, sess) => s + (sess.km ?? 0), 0)
}

function getWeekDoneCount(week: PlanWeek, logs: Record<string, TrainingLog>): number {
  let done = 0
  week.days.forEach((day, di) => {
    (day.sessions ?? []).forEach((sess, si) => {
      if (logs[`${week.n}_${di}_${si}`]?.done) done++
    })
  })
  return done
}

function getWeekSessionCount(week: PlanWeek): number {
  return week.days.reduce((s, d) => s + (d.sessions?.filter(s => s.c && s.c !== 'rest').length ?? 0), 0)
}

// ── Path node ─────────────────────────────────────────────────────────────────

function WeekNode({
  week, currentWeekN, logs, isLeft, onTap, totalWeeks,
}: {
  week:         PlanWeek
  currentWeekN: number
  logs:         Record<string, TrainingLog>
  isLeft:       boolean
  onTap:        () => void
  totalWeeks:   number
}) {
  const cfg        = getWeekConfig(week.b ?? 'k')
  const sessions   = getWeekSessions(week)
  const km         = getWeekKm(week)
  const done       = getWeekDoneCount(week, logs)
  const total      = getWeekSessionCount(week)
  const isCurrent  = week.n === currentWeekN
  const isPast     = week.n < currentWeekN
  const isUpcoming = week.n > currentWeekN
  const pct        = total > 0 ? done / total : 0
  const isRace     = week.b === 'r'

  // Unique session types for dot display
  const sessionTypes = [...new Set(sessions.map(s => getSessionColour(s.c)))].slice(0, 5)

  return (
    <div className={`flex items-center gap-3 ${isLeft ? 'flex-row' : 'flex-row-reverse'}`}>

      {/* Node circle */}
      <div className="relative flex-shrink-0" style={{ width: 72, height: 72 }}>
        {/* Progress arc SVG */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 72 72"
          style={{ transform: 'rotate(-90deg)' }}>
          {/* Track */}
          <circle cx={36} cy={36} r={32} fill="none"
            stroke={isCurrent || isPast ? `${cfg.colour}25` : 'rgba(255,255,255,0.05)'}
            strokeWidth={4} />
          {/* Progress */}
          {(isPast || isCurrent) && pct > 0 && (
            <circle cx={36} cy={36} r={32} fill="none"
              stroke={isPast ? cfg.colour + 'aa' : cfg.colour}
              strokeWidth={4} strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 32 * pct} ${2 * Math.PI * 32}`}
              style={{ transition: 'stroke-dasharray 0.8s ease' }} />
          )}
          {/* Full ring for completed past weeks */}
          {isPast && done === total && total > 0 && (
            <circle cx={36} cy={36} r={32} fill="none"
              stroke={cfg.colour} strokeWidth={4} opacity={0.5} />
          )}
        </svg>

        {/* Inner button */}
        <button
          onClick={onTap}
          className="absolute inset-2 rounded-full flex flex-col items-center justify-center transition-all active:scale-90"
          style={{
            background: isCurrent
              ? cfg.colour
              : isPast
                ? `${cfg.colour}20`
                : 'rgba(255,255,255,0.04)',
            border: isCurrent
              ? `none`
              : isPast
                ? `2px solid ${cfg.colour}60`
                : '2px solid rgba(255,255,255,0.08)',
            boxShadow: isCurrent
              ? `0 0 0 4px ${cfg.colour}30, 0 8px 24px ${cfg.colour}40`
              : 'none',
          }}>
          {isRace ? (
            <span className="text-xl">🏁</span>
          ) : isCurrent ? (
            <>
              <span className="text-xs font-black text-white leading-none">{week.n}</span>
              <span className="text-[9px] text-white opacity-80 leading-none mt-0.5">TODAY</span>
            </>
          ) : isPast && done === total && total > 0 ? (
            <span className="text-xl">✓</span>
          ) : (
            <span className="text-base font-black leading-none"
              style={{ color: isPast ? cfg.colour : 'rgba(255,255,255,0.25)' }}>
              {week.n}
            </span>
          )}
        </button>

        {/* Pulsing ring for current week */}
        {isCurrent && (
          <div className="absolute inset-0 rounded-full animate-ping opacity-20"
            style={{ background: cfg.colour, animationDuration: '2s' }} />
        )}
      </div>

      {/* Info card */}
      <button
        onClick={onTap}
        className={`flex-1 rounded-2xl px-3 py-2.5 text-left transition-all active:scale-[0.98] ${isUpcoming ? 'opacity-50' : ''}`}
        style={{
          background: isCurrent
            ? `${cfg.colour}15`
            : isPast
              ? 'rgba(255,255,255,0.03)'
              : 'rgba(255,255,255,0.02)',
          border: isCurrent
            ? `1.5px solid ${cfg.colour}40`
            : '1px solid rgba(255,255,255,0.06)',
          maxWidth: 200,
        }}>
        {/* Week type badge + week number */}
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full"
            style={{
              background: `${cfg.colour}20`,
              color: isCurrent || isPast ? cfg.colour : 'rgba(255,255,255,0.3)',
            }}>
            {cfg.emoji} {cfg.label}
          </span>
          <span className="text-[9px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
            {km > 0 ? `${km}km` : ''}
          </span>
        </div>

        {/* Week title */}
        <p className="text-xs font-bold leading-tight mb-1.5"
          style={{ color: isCurrent ? 'white' : isPast ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.25)' }}>
          {week.title || `Week ${week.n}`}
        </p>

        {/* Session dots */}
        <div className="flex gap-1 flex-wrap">
          {sessionTypes.map((colour, i) => (
            <div key={i} className="w-2 h-2 rounded-full"
              style={{ background: (isCurrent || isPast) ? colour : 'rgba(255,255,255,0.12)' }} />
          ))}
        </div>

        {/* Progress indicator for current */}
        {isCurrent && total > 0 && (
          <div className="mt-2 flex items-center gap-1.5">
            <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
              <div className="h-full rounded-full transition-all"
                style={{ width: `${pct * 100}%`, background: cfg.colour }} />
            </div>
            <span className="text-[9px] font-bold" style={{ color: cfg.colour }}>
              {done}/{total}
            </span>
          </div>
        )}
      </button>
    </div>
  )
}

// ── Connector path segment ─────────────────────────────────────────────────────

function PathConnector({ isPast, colour }: { isPast: boolean; colour: string }) {
  return (
    <div className="flex justify-center" style={{ height: 28 }}>
      <div className="w-0.5 rounded-full transition-all"
        style={{
          background: isPast
            ? `linear-gradient(180deg, ${colour}80, ${colour}40)`
            : 'rgba(255,255,255,0.06)',
        }} />
    </div>
  )
}

// ── Milestone marker ──────────────────────────────────────────────────────────

function MilestoneMarker({ label, emoji }: { label: string; emoji: string }) {
  return (
    <div className="flex items-center gap-2 py-1">
      <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
        style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.35)' }}>
        <span>{emoji}</span>
        <span>{label}</span>
      </div>
      <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
    </div>
  )
}

// ── Main PlanPath ─────────────────────────────────────────────────────────────

export default function PlanPath({ weeks, currentWeekN, logs, onWeekTap, planName, raceDate }: Props) {
  const currentRef = useRef<HTMLDivElement>(null)

  // Scroll to current week on mount
  useEffect(() => {
    currentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [])

  if (!weeks.length) return null

  // Group weeks with milestones between phases
  type Item =
    | { type: 'week'; week: PlanWeek; idx: number }
    | { type: 'milestone'; label: string; emoji: string }

  const items: Item[] = []
  let lastPhase = ''

  weeks.forEach((week, idx) => {
    const phase = week.ph ?? ''
    if (phase && phase !== lastPhase && idx > 0) {
      const milestones: Record<string, { label: string; emoji: string }> = {
        p2: { label: 'Building phase', emoji: '💪' },
        tr: { label: 'Taper begins', emoji: '⬇️' },
      }
      if (milestones[phase]) items.push({ type: 'milestone', ...milestones[phase] })
    }
    lastPhase = phase
    items.push({ type: 'week', week, idx })
  })

  return (
    <div className="px-4 pb-8">
      {/* Plan header */}
      <div className="mb-6 text-center">
        <p className="text-[10px] font-black uppercase tracking-widest mb-1"
          style={{ color: 'var(--color-text-tertiary)' }}>
          Your journey
        </p>
        <p className="text-base font-black" style={{ color: 'var(--color-text-primary)', letterSpacing: '-0.01em' }}>
          {planName}
        </p>
        {raceDate && (
          <p className="text-xs mt-0.5" style={{ color: '#ff4d6d' }}>
            🏁 {Math.ceil((new Date(raceDate).getTime() - Date.now()) / 86400000)} days to race
          </p>
        )}
      </div>

      {/* Start marker */}
      <MilestoneMarker label="Start" emoji="🚀" />
      <div className="flex justify-center mb-1" style={{ height: 20 }}>
        <div className="w-0.5" style={{ background: 'rgba(255,255,255,0.06)' }} />
      </div>

      {/* Week nodes */}
      <div className="space-y-0">
        {items.map((item, i) => {
          if (item.type === 'milestone') {
            return (
              <div key={`milestone-${i}`}>
                <PathConnector isPast={false} colour="#ffffff" />
                <MilestoneMarker label={item.label} emoji={item.emoji} />
                <div className="flex justify-center mb-0" style={{ height: 20 }}>
                  <div className="w-0.5" style={{ background: 'rgba(255,255,255,0.06)' }} />
                </div>
              </div>
            )
          }

          const { week, idx } = item
          const cfg = getWeekConfig(week.b ?? 'k')
          const isLeft = idx % 2 === 0
          const isPast = week.n < currentWeekN
          const isCurrent = week.n === currentWeekN

          // Find next item for connector colour
          const nextItem = items[i + 1]
          const showConnector = !!nextItem

          return (
            <div key={week.n} ref={isCurrent ? currentRef : undefined}>
              <WeekNode
                week={week}
                currentWeekN={currentWeekN}
                logs={logs}
                isLeft={isLeft}
                onTap={() => onWeekTap(week)}
                totalWeeks={weeks.length}
              />
              {showConnector && (
                <PathConnector
                  isPast={isPast}
                  colour={cfg.colour}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Race finish line */}
      <div className="flex justify-center mb-1" style={{ height: 20 }}>
        <div className="w-0.5" style={{ background: 'rgba(255,255,255,0.06)' }} />
      </div>
      <MilestoneMarker label={raceDate ? `Race day · ${new Date(raceDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}` : 'Finish line'} emoji="🏁" />
    </div>
  )
}
