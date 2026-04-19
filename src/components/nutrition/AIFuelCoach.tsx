'use client'

import { useState, useEffect } from 'react'

function AIFuelCoach({
  dayType, targets, totals, planName
}: {
  dayType: string
  targets: { kcal: number; protein: number; carbs: number; fat: number }
  totals: { kcal: number; protein: number; carbs: number; fat: number }
  planName: string
}) {
  const [tip, setTip] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  // Cache key so we don't re-call on every render
  const cacheKey = `nextsplit_fuel_tip_${new Date().toISOString().slice(0, 10)}_${dayType}`

  useEffect(() => {
    const cached = sessionStorage.getItem(cacheKey)
    if (cached) { setTip(cached); return }
  }, [cacheKey])

  async function fetchTip() {
    setLoading(true)
    setError(false)
    try {
      const kcalGap = targets.kcal > 0 ? targets.kcal - Math.round(totals.kcal) : null
      const res = await fetch('/api/ai/fuel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dayType, planName, targets, totals: { ...totals, kcalGap } }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      const text = data.tip
      if (text) {
        setTip(text)
        sessionStorage.setItem(cacheKey, text)
      } else {
        setError(true)
      }
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  if (!tip && !loading) {
    return (
      <button onClick={fetchTip}
        className="w-full flex items-center gap-3 bg-gradient-to-r from-teal-500 to-emerald-500 rounded-2xl p-4 text-left">
        <span className="text-2xl flex-shrink-0">🧠</span>
        <div className="flex-1">
          <p className="text-white text-xs font-bold">AI Nutrition Coach</p>
          <p className="text-teal-100 text-[10px] mt-0.5">Tap for today&apos;s personalised fuel tip</p>
        </div>
        <span className="text-white text-lg">›</span>
      </button>
    )
  }

  return (
    <div className="bg-gradient-to-r from-teal-500 to-emerald-500 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">🧠</span>
        <span className="text-white text-xs font-bold">AI Nutrition Coach</span>
        <span className="text-teal-200 text-[9px] ml-auto">Today · {dayType}</span>
      </div>
      {loading ? (
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-3 h-3 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-3 h-3 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      ) : error ? (
        <div className="flex items-center justify-between">
          <p className="text-teal-100 text-xs">Couldn&apos;t load tip right now.</p>
          <button onClick={fetchTip} className="text-white text-xs font-bold underline">Retry</button>
        </div>
      ) : (
        <div>
          <p className="text-white text-sm leading-relaxed">{tip}</p>
          <button onClick={() => { setTip(null); sessionStorage.removeItem(cacheKey) }}
            className="text-teal-200 text-[10px] mt-2 font-medium">
            ↻ New tip
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Calorie Ring ─────────────────────────────────────────────────────────────


export default AIFuelCoach
