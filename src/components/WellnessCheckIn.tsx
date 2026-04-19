'use client'

import { useState, useEffect } from 'react'
import { useWellness } from '@/hooks/useWellness'

function readinessScore(sleep: number, soreness: number, motivation: number): number {
  return Math.round((sleep * 0.4 + motivation * 0.35 + (6 - soreness) * 0.25) * 2)
}

function readinessLabel(score: number): { label: string; colour: string; emoji: string } {
  if (score >= 9) return { label: 'Excellent', colour: 'text-emerald-600', emoji: '🟢' }
  if (score >= 7) return { label: 'Good', colour: 'text-teal-600', emoji: '🟢' }
  if (score >= 5) return { label: 'Moderate', colour: 'text-amber-600', emoji: '🟡' }
  return { label: 'Low', colour: 'text-red-500', emoji: '🔴' }
}

const LS_KEY = 'nextsplit_wellness'
const LS_DISMISS_KEY = 'nextsplit_wellness_dismissed'

function todayKey(): string {
  const d = new Date()
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

interface LocalWellness {
  sleep: number; soreness: number; motivation: number; date: string
}

function SliderRow({ label, emoji, value, onChange, lowLabel, highLabel }: {
  label: string; emoji: string; value: number; onChange: (v: number) => void
  lowLabel: string; highLabel: string
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold text-gray-700">{emoji} {label}</span>
        <span className="text-sm font-bold text-[#0D9488]">{value}/5</span>
      </div>
      <input type="range" min={1} max={5} step={1} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-[#0D9488]" />
      <div className="flex justify-between text-[9px] text-gray-400 mt-0.5">
        <span>{lowLabel}</span><span>{highLabel}</span>
      </div>
    </div>
  )
}

interface Props {
  onReadiness?: (score: number) => void
}

export default function WellnessCheckIn({ onReadiness }: Props) {
  const { today: dbToday, logWellness } = useWellness()

  const [open, setOpen] = useState(false)
  const [sleep, setSleep] = useState(3)
  const [soreness, setSoreness] = useState(2)
  const [motivation, setMotivation] = useState(4)
  const [localData, setLocalData] = useState<LocalWellness | null>(null)
  const [saving, setSaving] = useState(false)

  // Hydrate from localStorage first (instant)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (raw) {
        const d: LocalWellness = JSON.parse(raw)
        if (d.date === todayKey()) {
          setLocalData(d)
          setSleep(d.sleep); setSoreness(d.soreness); setMotivation(d.motivation)
          onReadiness?.(readinessScore(d.sleep, d.soreness, d.motivation))
        }
      }
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Prefer DB if it has today's log
  useEffect(() => {
    if (dbToday) {
      const s = dbToday.sleep ?? 3
      const sor = dbToday.soreness ?? 2
      const mot = dbToday.mood ?? 4
      setSleep(s); setSoreness(sor); setMotivation(mot)
      setLocalData({ sleep: s, soreness: sor, motivation: mot, date: todayKey() })
      onReadiness?.(readinessScore(s, sor, mot))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbToday])

  async function handleSave() {
    setSaving(true)
    const d: LocalWellness = { sleep, soreness, motivation, date: todayKey() }
    localStorage.setItem(LS_KEY, JSON.stringify(d))
    setLocalData(d)
    onReadiness?.(readinessScore(sleep, soreness, motivation))
    try {
      await logWellness({ log_date: todayKey(), log_type: 'daily', sleep, soreness, mood: motivation })
    } catch { /* non-fatal */ }
    setSaving(false)
    setOpen(false)
  }

  const checkedIn = localData

  const score = readinessScore(sleep, soreness, motivation)

  if (checkedIn && !open) {
    const existScore = readinessScore(checkedIn.sleep, checkedIn.soreness, checkedIn.motivation)
    const status = readinessLabel(existScore)
    return (
      <button onClick={() => setOpen(true)}
        className="w-full flex items-center justify-between bg-white rounded-2xl border border-gray-100 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="text-xl">{status.emoji}</span>
          <div className="text-left">
            <div className="text-xs font-semibold text-gray-700">Readiness</div>
            <div className={`text-sm font-bold ${status.colour}`}>{status.label}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-black text-[#0D9488]">{existScore}</div>
          <div className="text-[10px] text-gray-400">/10 · edit</div>
        </div>
      </button>
    )
  }

  if (!open) {
    // Check if dismissed today
    try {
      const dismissedDate = localStorage.getItem(LS_DISMISS_KEY)
      if (dismissedDate === todayKey()) return null
    } catch {}

    return (
      <div className="w-full flex items-center gap-3 bg-white rounded-2xl border border-dashed border-gray-200 px-4 py-3">
        <button onClick={() => setOpen(true)} className="flex items-center gap-3 flex-1 text-left">
          <span className="text-xl">🌅</span>
          <div>
            <div className="text-xs font-semibold text-gray-700">Morning check-in</div>
            <div className="text-xs text-gray-400">Tap to log readiness</div>
          </div>
          <div className="ml-auto">
            <span className="text-[11px] font-semibold text-[#0D9488] bg-teal-50 px-2.5 py-1 rounded-full">Log</span>
          </div>
        </button>
        <button
          onClick={() => {
            try { localStorage.setItem(LS_DISMISS_KEY, todayKey()) } catch {}
            // Force re-render by setting a dismissed flag — use a small hack: trigger state
            setSaving(s => { void s; return false })
          }}
          className="text-gray-300 text-lg leading-none pl-2 flex-shrink-0"
          aria-label="Dismiss for today"
        >×</button>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm font-bold text-gray-900">How are you feeling?</div>
        <button onClick={() => setOpen(false)} className="text-gray-400 text-lg leading-none">×</button>
      </div>
      <div className="space-y-5 mb-5">
        <SliderRow label="Sleep quality" emoji="😴" value={sleep} onChange={setSleep} lowLabel="Terrible" highLabel="Great" />
        <SliderRow label="Muscle soreness" emoji="💪" value={soreness} onChange={setSoreness} lowLabel="Fresh" highLabel="Very sore" />
        <SliderRow label="Motivation" emoji="🔥" value={motivation} onChange={setMotivation} lowLabel="Low" highLabel="High" />
      </div>
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs text-gray-500">Readiness score</div>
        <div className={`text-lg font-black ${readinessLabel(score).colour}`}>
          {score}/10 · {readinessLabel(score).label}
        </div>
      </div>
      <button onClick={handleSave} disabled={saving}
        className="w-full py-3 bg-[#0D9488] text-white rounded-xl text-sm font-semibold disabled:opacity-50">
        {saving ? 'Saving…' : 'Save check-in'}
      </button>
    </div>
  )
}
