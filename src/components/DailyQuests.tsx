'use client'

import { useMemo } from 'react'
import type { TrainingLog } from '@/types/database'

interface Quest {
  id:       string
  emoji:    string
  label:    string
  desc:     string
  xp:       number
  progress: number  // 0–1
  done:     boolean
  colour:   string
}

interface Props {
  logs:      TrainingLog[]
  weeklyKm:  number
  streak:    number
  hasPlan:   boolean
}

export default function DailyQuests({ logs, weeklyKm, streak, hasPlan }: Props) {
  const quests = useMemo((): Quest[] => {
    const todayStr = new Date().toISOString().slice(0, 10)
    const loggedToday = logs.some(l => l.done && l.created_at.startsWith(todayStr))
    const todayCount  = logs.filter(l => l.done && l.created_at.startsWith(todayStr)).length

    // Week sessions
    const mon = new Date()
    mon.setDate(mon.getDate() - (mon.getDay() === 0 ? 6 : mon.getDay() - 1))
    mon.setHours(0,0,0,0)
    const weekSessions = logs.filter(l => l.done && new Date(l.created_at) >= mon).length

    const all: Quest[] = [
      {
        id:       'log_today',
        emoji:    '🏃',
        label:    'Run today',
        desc:     'Log any session today',
        xp:       25,
        progress: loggedToday ? 1 : 0,
        done:     loggedToday,
        colour:   '#ff3d6e',
      },
      {
        id:       'weekly_km',
        emoji:    '📍',
        label:    `${Math.min(weeklyKm, 30).toFixed(0)}/30km this week`,
        desc:     'Hit 30km this week',
        xp:       50,
        progress: Math.min(weeklyKm / 30, 1),
        done:     weeklyKm >= 30,
        colour:   '#4d8aff',
      },
      {
        id:       'streak_3',
        emoji:    '🔥',
        label:    `${Math.min(streak, 3)}/3 day streak`,
        desc:     'Train 3 days in a row',
        xp:       30,
        progress: Math.min(streak / 3, 1),
        done:     streak >= 3,
        colour:   '#ffb800',
      },
      {
        id:       'sessions_3',
        emoji:    '💪',
        label:    `${Math.min(weekSessions, 3)}/3 sessions this week`,
        desc:     'Complete 3 sessions this week',
        xp:       40,
        progress: Math.min(weekSessions / 3, 1),
        done:     weekSessions >= 3,
        colour:   '#a855f7',
      },
    ]

    // Show only 3 — prioritise incomplete ones, sort done to end
    return all
      .sort((a, b) => {
        if (a.done && !b.done) return 1
        if (!a.done && b.done) return -1
        return b.progress - a.progress
      })
      .slice(0, 3)
  }, [logs, weeklyKm, streak])

  const doneCount = quests.filter(q => q.done).length
  const totalXP   = quests.filter(q => q.done).reduce((s, q) => s + q.xp, 0)

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
      {/* Header */}
      <div className="px-4 pt-3 pb-2 flex items-center justify-between border-b"
        style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex items-center gap-2">
          <span className="text-base">⚡</span>
          <p className="text-xs font-black uppercase tracking-widest"
            style={{ color: 'var(--color-text-tertiary)' }}>Daily quests</p>
        </div>
        <div className="flex items-center gap-2">
          {totalXP > 0 && (
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(255,184,0,0.15)', color: '#ffb800' }}>
              +{totalXP} XP earned
            </span>
          )}
          <span className="text-xs font-bold" style={{ color: 'var(--color-text-tertiary)' }}>
            {doneCount}/{quests.length}
          </span>
        </div>
      </div>

      {/* Quests */}
      <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
        {quests.map(q => (
          <div key={q.id} className="px-4 py-3 flex items-center gap-3">
            {/* Icon */}
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
              style={{ background: q.done ? `${q.colour}20` : 'var(--color-surface-2)' }}>
              {q.done ? '✓' : q.emoji}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-bold"
                  style={{ color: q.done ? 'var(--color-text-tertiary)' : 'var(--color-text-primary)',
                    textDecoration: q.done ? 'line-through' : 'none' }}>
                  {q.label}
                </p>
                <span className="text-[10px] font-black ml-2 flex-shrink-0"
                  style={{ color: q.done ? '#00e676' : q.colour }}>
                  +{q.xp} XP
                </span>
              </div>
              {/* Progress bar */}
              <div className="h-1.5 rounded-full overflow-hidden"
                style={{ background: 'var(--color-surface-2)' }}>
                <div className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${q.progress * 100}%`,
                    background: q.done
                      ? 'linear-gradient(90deg,#00e676,#00c45a)'
                      : `linear-gradient(90deg,${q.colour},${q.colour}cc)`,
                    boxShadow: q.done ? '0 0 6px rgba(0,230,118,0.5)' : `0 0 6px ${q.colour}60`,
                  }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* All done celebration */}
      {doneCount === quests.length && (
        <div className="px-4 py-3 text-center border-t"
          style={{ borderColor: 'var(--color-border)', background: 'rgba(0,230,118,0.05)' }}>
          <p className="text-xs font-black" style={{ color: '#00e676' }}>
            🎉 All quests done today! +{totalXP} XP
          </p>
        </div>
      )}
    </div>
  )
}
