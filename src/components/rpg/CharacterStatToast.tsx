'use client'

import { useEffect, useState } from 'react'
import { onCharacterXP, type CharacterXPDeltas } from '@/lib/character-events'
import { BUILD_CLASS_META, type BuildClass } from '@/lib/character'

// Global toast that surfaces character-system stat deltas after a session
// log fires. Mounted once in app/layout.tsx and listens for the
// 'nextsplit:character-xp' CustomEvent dispatched from the session-log
// flows in TrainClient + useSessionLogging.
//
// UX: slides up from the bottom (above the bottom-nav safe-area), stays
// for 4s, fades out. Multiple deltas in quick succession queue rather than
// stomp — the next toast slides in once the previous finishes.

interface QueuedToast extends CharacterXPDeltas {
  id: number  // monotonic for React key
}

const VISIBLE_MS  = 4000
const FADE_OUT_MS = 400

export function CharacterStatToast() {
  const [queue,   setQueue]   = useState<QueuedToast[]>([])
  const [current, setCurrent] = useState<QueuedToast | null>(null)
  const [visible, setVisible] = useState(false)

  // Listen for character-XP events; push onto queue.
  useEffect(() => {
    let counter = 0
    return onCharacterXP((d) => {
      counter += 1
      setQueue(q => [...q, { ...d, id: counter }])
    })
  }, [])

  // Drain queue: when nothing is visible, pop next + show it.
  useEffect(() => {
    if (current || queue.length === 0) return
    const [next, ...rest] = queue
    setQueue(rest)
    setCurrent(next)
    setVisible(true)

    const fadeAt = setTimeout(() => setVisible(false), VISIBLE_MS)
    const clearAt = setTimeout(() => setCurrent(null), VISIBLE_MS + FADE_OUT_MS)
    return () => { clearTimeout(fadeAt); clearTimeout(clearAt) }
  }, [current, queue])

  if (!current) return null

  const meta = BUILD_CLASS_META[current.build_class as BuildClass]

  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 z-50 pointer-events-none"
      style={{
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 92px)', // above bottom nav
        opacity: visible ? 1 : 0,
        transform: `translateX(-50%) translateY(${visible ? 0 : 20}px)`,
        transition: `opacity ${FADE_OUT_MS}ms ease, transform ${FADE_OUT_MS}ms ease`,
      }}
      role="status"
      aria-live="polite"
    >
      <div
        className="rounded-2xl px-4 py-3 flex items-center gap-3"
        style={{
          background: 'linear-gradient(135deg, var(--ns-magenta) 0%, var(--ns-magenta-light) 100%)',
          color: 'white',
          boxShadow: '0 8px 32px rgba(255,61,139,0.4)',
          minWidth: 240,
          maxWidth: 360,
        }}
      >
        <span className="text-2xl" aria-hidden>{meta?.emoji ?? '🏃'}</span>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black uppercase tracking-widest opacity-90">
            Stats earned · {meta?.name ?? current.build_class}
          </p>
          <div className="flex items-center gap-3 mt-0.5">
            {current.speed_delta > 0 && (
              <span className="text-sm font-black">⚡ +{current.speed_delta}</span>
            )}
            {current.endurance_delta > 0 && (
              <span className="text-sm font-black">🫁 +{current.endurance_delta}</span>
            )}
            {current.resilience_delta > 0 && (
              <span className="text-sm font-black">🛡 +{current.resilience_delta}</span>
            )}
          </div>
          {current.multiplier_applied > 1.0 && (
            <p className="text-[10px] font-bold opacity-80 mt-0.5">
              {current.multiplier_applied}× engagement boost applied
            </p>
          )}
        </div>
        <span className="text-xs font-black tabular-nums opacity-90">
          LV {current.new_level}
        </span>
      </div>
    </div>
  )
}
