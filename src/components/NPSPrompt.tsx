'use client'

/**
 * NPSPrompt — Phase A7
 * In-app Net Promoter Score. Shown at Day 7 and Day 30 after first session.
 * Coach voice: "Quick question — it helps us improve."
 *
 * Triggers: checked on Today tab mount.
 * Storage: localStorage tracks shown/completed dates to avoid repeat.
 */

import { useState, useEffect } from 'react'
import { Analytics } from '@/lib/analytics'

type Trigger = 'day_7' | 'day_30'

const SHOWN_KEY   = 'nextsplit_nps_shown'
const DONE_KEY    = 'nextsplit_nps_done'

interface Props {
  firstSessionAt: string | null  // ISO date string
}

export default function NPSPrompt({ firstSessionAt }: Props) {
  const [trigger, setTrigger]     = useState<Trigger | null>(null)
  const [score, setScore]         = useState<number | null>(null)
  const [comment, setComment]     = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!firstSessionAt) return

    try {
      const done  = JSON.parse(localStorage.getItem(DONE_KEY)  ?? '[]') as string[]
      const shown = JSON.parse(localStorage.getItem(SHOWN_KEY) ?? '[]') as string[]

      const daysSince = Math.floor(
        (Date.now() - new Date(firstSessionAt).getTime()) / 86400000
      )

      // Day 30 takes priority if not done
      if (daysSince >= 30 && !done.includes('day_30') && !shown.includes('day_30')) {
        setTrigger('day_30')
        const updated = [...shown, 'day_30']
        localStorage.setItem(SHOWN_KEY, JSON.stringify(updated))
        Analytics.npsShown('day_30')
      } else if (daysSince >= 7 && !done.includes('day_7') && !shown.includes('day_7')) {
        setTrigger('day_7')
        const updated = [...shown, 'day_7']
        localStorage.setItem(SHOWN_KEY, JSON.stringify(updated))
        Analytics.npsShown('day_7')
      }
    } catch { /* ignore */ }
  }, [firstSessionAt])

  function handleSubmit() {
    if (score === null || !trigger) return
    Analytics.npsSubmitted(score, trigger, comment || undefined)
    try {
      const done = JSON.parse(localStorage.getItem(DONE_KEY) ?? '[]') as string[]
      localStorage.setItem(DONE_KEY, JSON.stringify([...done, trigger]))
    } catch { /* ignore */ }
    setSubmitted(true)
    setTimeout(() => setTrigger(null), 2000)
  }

  function handleDismiss() {
    if (!trigger) return
    Analytics.npsDismissed(trigger)
    setDismissed(true)
    setTrigger(null)
  }

  if (!trigger || dismissed) return null

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40" onClick={handleDismiss} />
      <div className="fixed bottom-0 left-0 right-0 z-50 max-w-lg mx-auto">
        <div className="bg-white rounded-t-3xl px-5 pt-5 pb-8">
          <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />

          {submitted ? (
            <div className="text-center py-4">
              <div className="text-3xl mb-2">🙏</div>
              <p className="text-sm font-bold text-gray-900">Thanks — that helps a lot.</p>
              <p className="text-xs text-gray-500 mt-1">Feedback goes straight to the team.</p>
            </div>
          ) : (
            <>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                Quick question
              </p>
              <h2 className="text-sm font-bold text-gray-900 mb-1">
                How likely are you to recommend NextSplit to a running friend?
              </h2>
              <p className="text-xs text-gray-400 mb-4">
                It helps us improve. Takes 10 seconds.
              </p>

              {/* Score selector */}
              <div className="flex gap-1.5 mb-2">
                {Array.from({ length: 11 }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => setScore(i)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border-2 transition-all ${
                      score === i
                        ? 'text-white border-transparent'
                        : 'text-gray-600 border-gray-200 hover:border-gray-300'
                    }`}
                    style={score === i ? {
                      background: i >= 9 ? 'var(--ns-forest)' : i >= 7 ? '#f59e0b' : '#ef4444',
                      borderColor: 'transparent',
                    } : {}}
                  >
                    {i}
                  </button>
                ))}
              </div>
              <div className="flex justify-between text-[9px] text-gray-400 mb-4">
                <span>Not likely</span>
                <span>Very likely</span>
              </div>

              {/* Optional comment — only show if score selected */}
              {score !== null && (
                <textarea
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder={
                    score >= 9 ? "What do you love most?" :
                    score >= 7 ? "What would make it a 10?" :
                    "What's not working for you?"
                  }
                  rows={2}
                  className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-[var(--ns-forest)] resize-none mb-3"
                />
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleDismiss}
                  className="px-4 py-3 rounded-2xl border border-gray-200 text-xs font-semibold text-gray-500"
                >
                  Skip
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={score === null}
                  className="flex-1 py-3 rounded-2xl text-white text-sm font-bold disabled:opacity-40 transition-all"
                  style={{ background: 'var(--ns-forest)' }}
                >
                  Submit
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
