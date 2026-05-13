'use client'

import { useEffect, useRef, useState } from 'react'
import { onCharacterXP, type CharacterXPDeltas } from '@/lib/character-events'
import { BUILD_CLASS_META, type BuildClass } from '@/lib/character'

interface QueuedToast extends CharacterXPDeltas {
  id: number
}

const VISIBLE_MS  = 2500
const FADE_OUT_MS = 300
const COALESCE_WINDOW_MS = 200
const MAX_QUEUE = 2

export function CharacterStatToast() {
  const [queue,   setQueue]   = useState<QueuedToast[]>([])
  const [current, setCurrent] = useState<QueuedToast | null>(null)
  const [visible, setVisible] = useState(false)
  const [celebrationActive, setCelebrationActive] = useState(false)
  const lastEventAtRef = useRef(0)

  useEffect(() => {
    let counter = 0
    return onCharacterXP((d) => {
      counter += 1
      const now = Date.now()
      const withinCoalesce = now - lastEventAtRef.current < COALESCE_WINDOW_MS
      lastEventAtRef.current = now

      setQueue(q => {
        if (withinCoalesce && q.length > 0) {
          const last = q[q.length - 1]
          const merged: QueuedToast = {
            ...last,
            speed_delta: last.speed_delta + d.speed_delta,
            endurance_delta: last.endurance_delta + d.endurance_delta,
            resilience_delta: last.resilience_delta + d.resilience_delta,
            new_level: Math.max(last.new_level, d.new_level),
            multiplier_applied: Math.max(last.multiplier_applied, d.multiplier_applied),
          }
          return [...q.slice(0, -1), merged]
        }
        if (q.length >= MAX_QUEUE) return [...q.slice(1), { ...d, id: counter }]
        return [...q, { ...d, id: counter }]
      })
    })
  }, [])

  // PR E2 — hold while SessionCelebration is mounted. The celebration
  // already shows the XP/level delta; toast firing simultaneously is
  // the "multi-modal confetti sequence" founder flagged. Queue keeps
  // accumulating from background dispatches; flushes on dismissed.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const onShown     = () => setCelebrationActive(true)
    const onDismissed = () => setCelebrationActive(false)
    window.addEventListener('nextsplit:celebration-shown',     onShown)
    window.addEventListener('nextsplit:celebration-dismissed', onDismissed)
    return () => {
      window.removeEventListener('nextsplit:celebration-shown',     onShown)
      window.removeEventListener('nextsplit:celebration-dismissed', onDismissed)
    }
  }, [])

  useEffect(() => {
    if (celebrationActive) return
    if (current || queue.length === 0) return
    const [next, ...rest] = queue
    setQueue(rest)
    setCurrent(next)
    setVisible(true)

    const fadeAt = setTimeout(() => setVisible(false), VISIBLE_MS)
    const clearAt = setTimeout(() => setCurrent(null), VISIBLE_MS + FADE_OUT_MS)
    return () => { clearTimeout(fadeAt); clearTimeout(clearAt) }
  }, [current, queue, celebrationActive])

  const dismiss = () => {
    setVisible(false)
    setTimeout(() => setCurrent(null), FADE_OUT_MS)
  }

  if (!current) return null

  const meta = BUILD_CLASS_META[current.build_class as BuildClass]

  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 z-50"
      style={{
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 92px)',
        opacity: visible ? 1 : 0,
        transform: `translateX(-50%) translateY(${visible ? 0 : 20}px)`,
        transition: `opacity ${FADE_OUT_MS}ms ease, transform ${FADE_OUT_MS}ms ease`,
      }}
      role="status"
      aria-live="polite"
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss stats toast"
        className="rounded-2xl px-4 py-3 flex items-center gap-3 cursor-pointer"
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
      </button>
    </div>
  )
}
