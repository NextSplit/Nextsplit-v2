'use client'

import { useState, useEffect } from 'react'

interface WellnessData {
  sleep: number      // 1-5
  soreness: number   // 1-5
  motivation: number // 1-5
  date: string
}

function readinessScore(w: WellnessData): number {
  // Weighted: sleep most important
  return Math.round((w.sleep * 0.4 + w.motivation * 0.35 + (6 - w.soreness) * 0.25) * 2)
}

function readinessLabel(score: number): { label: string; colour: string; emoji: string } {
  if (score >= 9) return { label: 'Excellent', colour: 'text-emerald-600', emoji: '🟢' }
  if (score >= 7) return { label: 'Good', colour: 'text-teal-600', emoji: '🟢' }
  if (score >= 5) return { label: 'Moderate', colour: 'text-amber-600', emoji: '🟡' }
  return { label: 'Low', colour: 'text-red-500', emoji: '🔴' }
}

const STORAGE_KEY = 'nextsplit_wellness'

function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

interface SliderRowProps {
  label: string
  emoji: string
  value: number
  onChange: (v: number) => void
  lowLabel: string
  highLabel: string
}

function SliderRow({ label, emoji, value, onChange, lowLabel, highLabel }: SliderRowProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold text-gray-700">{emoji} {label}</span>
        <span className="text-sm font-bold text-[#0D9488]">{value}/5</span>
      </div>
      <input
        type="range" min={1} max={5} step={1} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-[#0D9488]"
      />
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
  const [existing, setExisting] = useState<WellnessData | null>(null)
  const [open, setOpen] = useState(false)
  const [sleep, setSleep] = useState(3)
  const [soreness, setSoreness] = useState(2)
  const [motivation, setMotivation] = useState(4)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const data: WellnessData = JSON.parse(raw)
        if (data.date === todayKey()) {
          setExisting(data)
          onReadiness?.(readinessScore(data))
          setSleep(data.sleep)
          setSoreness(data.soreness)
          setMotivation(data.motivation)
        }
      }
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleSave() {
    const data: WellnessData = { sleep, soreness, motivation, date: todayKey() }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    setExisting(data)
    onReadiness?.(readinessScore(data))
    setSaved(true)
    setOpen(false)
    setTimeout(() => setSaved(false), 2000)
  }

  const score = readinessScore({ sleep, soreness, motivation, date: todayKey() })
  const status = existing ? readinessLabel(readinessScore(existing)) : null

  // Already checked in today
  if (existing && !open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-between bg-white rounded-2xl border border-gray-100 px-4 py-3"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-xl">{status?.emoji}</span>
          <div className="text-left">
            <div className="text-xs font-semibold text-gray-700">Readiness</div>
            <div className={`text-sm font-bold ${status?.colour}`}>{status?.label}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-black text-[#0D9488]">{readinessScore(existing)}</div>
          <div className="text-[10px] text-gray-400">/10 · edit</div>
        </div>
      </button>
    )
  }

  // Not yet checked in
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-3 bg-white rounded-2xl border border-dashed border-gray-200 px-4 py-3"
      >
        <span className="text-xl">🌅</span>
        <div className="text-left">
          <div className="text-xs font-semibold text-gray-700">Morning check-in</div>
          <div className="text-xs text-gray-400">Tap to log readiness</div>
        </div>
        <div className="ml-auto">
          <span className="text-[11px] font-semibold text-[#0D9488] bg-teal-50 px-2.5 py-1 rounded-full">Log</span>
        </div>
      </button>
    )
  }

  // Check-in form
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm font-bold text-gray-900">How are you feeling?</div>
        <button onClick={() => setOpen(false)} className="text-gray-400 text-lg leading-none">×</button>
      </div>

      <div className="space-y-5 mb-5">
        <SliderRow
          label="Sleep quality" emoji="😴"
          value={sleep} onChange={setSleep}
          lowLabel="Terrible" highLabel="Great"
        />
        <SliderRow
          label="Muscle soreness" emoji="💪"
          value={soreness} onChange={setSoreness}
          lowLabel="Fresh" highLabel="Very sore"
        />
        <SliderRow
          label="Motivation" emoji="🔥"
          value={motivation} onChange={setMotivation}
          lowLabel="Low" highLabel="High"
        />
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="text-xs text-gray-500">Readiness score</div>
        <div className={`text-lg font-black ${readinessLabel(score).colour}`}>
          {score}/10 · {readinessLabel(score).label}
        </div>
      </div>

      <button
        onClick={handleSave}
        className="w-full py-3 bg-[#0D9488] text-white rounded-xl text-sm font-semibold"
      >
        Save check-in
      </button>
    </div>
  )
}
