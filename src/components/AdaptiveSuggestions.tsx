'use client'

import { useState, useEffect } from 'react'
import type { PlanWeek, TrainingLog } from '@/types/database'

interface Suggestion {
  id: string
  type: 'load' | 'pace' | 'recovery' | 'positive'
  title: string
  body: string
  action?: string
}

interface Props {
  weeks: PlanWeek[]
  logs: Record<string, TrainingLog>
  currentWeek: number
  planId: string
}

const SUGGESTION_CACHE_KEY = (planId: string) => `nextsplit_suggestions_${planId}`
const SUGGESTION_DISMISSED_KEY = (planId: string) => `nextsplit_suggestions_dismissed_${planId}`
const MIN_WEEKS_FOR_ANALYSIS = 3
const REGENERATE_AFTER_WEEKS = 4

interface CachedSuggestions {
  suggestions: Suggestion[]
  generatedAtWeek: number
  generatedAt: string
}

function typeStyle(type: Suggestion['type']) {
  switch (type) {
    case 'load':     return { bg: 'bg-amber-50',  border: 'border-amber-200', icon: '⚠️', text: 'text-amber-800' }
    case 'pace':     return { bg: 'bg-blue-50',   border: 'border-blue-200',  icon: '⚡', text: 'text-blue-800'  }
    case 'recovery': return { bg: 'bg-purple-50', border: 'border-purple-200',icon: '😴', text: 'text-purple-800'}
    case 'positive': return { bg: 'bg-emerald-50',border: 'border-emerald-200',icon: '🎯', text: 'text-emerald-800'}
  }
}

export default function AdaptiveSuggestions({ weeks, logs, currentWeek, planId }: Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [generatedAtWeek, setGeneratedAtWeek] = useState<number | null>(null)

  // Load cached suggestions and dismissed list on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SUGGESTION_CACHE_KEY(planId))
      if (raw) {
        const cached = JSON.parse(raw) as CachedSuggestions
        setSuggestions(cached.suggestions)
        setGeneratedAtWeek(cached.generatedAtWeek)
      }
      const dis = localStorage.getItem(SUGGESTION_DISMISSED_KEY(planId))
      if (dis) setDismissed(new Set(JSON.parse(dis)))
    } catch {}
  }, [planId])

  // Auto-generate if: enough weeks logged, and haven't generated this cycle
  useEffect(() => {
    if (currentWeek < MIN_WEEKS_FOR_ANALYSIS) return
    if (loading) return

    const shouldGenerate = generatedAtWeek === null ||
      currentWeek - generatedAtWeek >= REGENERATE_AFTER_WEEKS

    if (shouldGenerate) {
      generateSuggestions()
    }
  }, [currentWeek, generatedAtWeek]) // eslint-disable-line react-hooks/exhaustive-deps

  async function generateSuggestions() {
    setLoading(true)

    try {
      // Build training analysis
      const logArr = Object.values(logs).filter(l => l.done)

      // Last 4 weeks: planned vs actual km
      const recentWeeks = weeks.filter(w => w.n >= currentWeek - 4 && w.n < currentWeek)

      const weekStats = recentWeeks.map(w => {
        const plannedKm = w.days.reduce((s, d) =>
          s + d.sessions.reduce((ss, s2) => ss + (s2.km ?? 0), 0), 0)
        const loggedKm = logArr
          .filter(l => l.week_n === w.n)
          .reduce((s, l) => s + (l.km ?? 0), 0)
        const sessionsPlanned = w.days.reduce((s, d) =>
          s + d.sessions.filter(s2 => s2.c !== 'rest').length, 0)
        const sessionsDone = logArr.filter(l => l.week_n === w.n && l.done).length
        return {
          weekN: w.n,
          title: w.title,
          type: w.b,
          plannedKm: Math.round(plannedKm),
          loggedKm: Math.round(loggedKm * 10) / 10,
          adherencePct: plannedKm > 0 ? Math.round((loggedKm / plannedKm) * 100) : 0,
          sessionsPlanned,
          sessionsDone,
        }
      })

      // Avg pace from logs — pace is stored as "m:ss" string
      const recentPaceStrings = logArr
        .filter(l => l.pace && l.week_n != null && Number(l.week_n) >= currentWeek - 4)
        .map(l => {
          const parts = (l.pace ?? '').split(':')
          if (parts.length === 2) return parseInt(parts[0]) * 60 + parseInt(parts[1])
          return null
        })
        .filter((p): p is number => p !== null && p > 0)
      const avgPaceSecs = recentPaceStrings.length > 0
        ? recentPaceStrings.reduce((s, p) => s + p, 0) / recentPaceStrings.length : null

      // ACWR approximation
      const acuteKm = logArr.filter(l => l.week_n != null && l.week_n === currentWeek - 1)
        .reduce((s, l) => s + (l.km ?? 0), 0)
      const chronicKm = weekStats.length >= 3
        ? weekStats.slice(-4).reduce((s, w) => s + w.loggedKm, 0) / Math.max(weekStats.slice(-4).length, 1)
        : null
      const acwr = chronicKm && chronicKm > 0 ? acuteKm / chronicKm : null

      const analysisData = {
        current_week: currentWeek,
        total_weeks: weeks.length,
        week_stats: weekStats,
        avg_adherence_pct: weekStats.length > 0
          ? Math.round(weekStats.reduce((s, w) => s + w.adherencePct, 0) / weekStats.length) : null,
        avg_pace_per_km: avgPaceSecs
          ? `${Math.floor(avgPaceSecs / 60)}:${String(Math.round(avgPaceSecs % 60)).padStart(2, '0')}` : null,
        acwr: acwr ? Math.round(acwr * 100) / 100 : null,
        total_sessions_logged: logArr.length,
      }

      const prompt = `You are an expert running coach reviewing a runner's last 4 weeks of training.

Training data:
${JSON.stringify(analysisData, null, 2)}

Generate 2-3 specific, actionable coaching suggestions based on the data. 

ACWR guidance: under 0.8 = under-training, 0.8-1.3 = optimal, over 1.3 = injury risk.
Adherence guidance: under 70% = concern, 70-90% = acceptable, 90-110% = ideal, over 110% = overdoing it.

Respond with ONLY a JSON array (no markdown):
[
  {
    "id": "unique-slug",
    "type": "load" | "pace" | "recovery" | "positive",
    "title": "Short title (under 8 words)",
    "body": "2-3 sentence specific suggestion referencing their data",
    "action": "optional: specific action they should take this week"
  }
]

Types: "load" for volume/injury concerns, "pace" for speed/intensity feedback, "recovery" for rest/wellness, "positive" for achievements to reinforce.
Be specific, not generic. Reference actual numbers from their data.`

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }],
        }),
      })

      if (!res.ok) throw new Error('API error')
      const data = await res.json()
      const text = data.content?.[0]?.text ?? '[]'
      const clean = text.replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(clean) as Suggestion[]

      const cached: CachedSuggestions = {
        suggestions: parsed,
        generatedAtWeek: currentWeek,
        generatedAt: new Date().toISOString(),
      }

      try { localStorage.setItem(SUGGESTION_CACHE_KEY(planId), JSON.stringify(cached)) } catch {}
      setSuggestions(parsed)
      setGeneratedAtWeek(currentWeek)
    } catch (e) {
      console.error('Failed to generate suggestions', e)
    } finally {
      setLoading(false)
    }
  }

  function dismiss(id: string) {
    const next = new Set([...dismissed, id])
    setDismissed(next)
    try { localStorage.setItem(SUGGESTION_DISMISSED_KEY(planId), JSON.stringify([...next])) } catch {}
  }

  const visible = suggestions.filter(s => !dismissed.has(s.id))

  // Don't render anything until enough weeks have passed
  if (currentWeek < MIN_WEEKS_FOR_ANALYSIS) return null
  if (!loading && visible.length === 0) return null

  return (
    <div className="space-y-2">
      {loading && (
        <div className="bg-white rounded-2xl border border-gray-100 px-4 py-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#0D9488] flex items-center justify-center flex-shrink-0 animate-pulse">
            <span className="text-sm">🤖</span>
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-700">Analysing your training…</div>
            <div className="text-[11px] text-gray-400">Reviewing the last 4 weeks</div>
          </div>
        </div>
      )}

      {!loading && visible.map(suggestion => {
        const style = typeStyle(suggestion.type)
        return (
          <div key={suggestion.id} className={`rounded-2xl border ${style.bg} ${style.border} overflow-hidden`}>
            <div className="px-4 py-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5 flex-1 min-w-0">
                  <span className="text-base flex-shrink-0 mt-0.5">{style.icon}</span>
                  <div>
                    <div className={`text-sm font-bold ${style.text} mb-0.5`}>{suggestion.title}</div>
                    <p className={`text-[11px] leading-relaxed ${style.text} opacity-90`}>{suggestion.body}</p>
                    {suggestion.action && (
                      <div className={`mt-1.5 text-[11px] font-semibold ${style.text}`}>
                        → {suggestion.action}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => dismiss(suggestion.id)}
                  className="flex-shrink-0 text-gray-400 hover:text-gray-600 p-1"
                  aria-label="Dismiss suggestion"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
