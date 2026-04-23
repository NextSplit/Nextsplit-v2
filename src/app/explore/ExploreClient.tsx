'use client'

/**
 * Explore — Athlete discovery tab
 * Coaches · Marketplace plans · AI Coaching chat
 */

import { useState } from 'react'
import Link from 'next/link'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>

interface Props {
  coaches:       AnyRecord[]
  featuredPlans: AnyRecord[]
  activePlanId:  string | null
}

type Tab = 'coaches' | 'plans' | 'ai'

const LEVEL_PILL: Record<string, string> = {
  beginner:     'bg-emerald-900/40 text-emerald-300',
  intermediate: 'bg-amber-900/40 text-amber-300',
  advanced:     'bg-red-900/40 text-red-300',
}

export default function ExploreClient({ coaches, featuredPlans, activePlanId }: Props) {
  const [tab, setTab]       = useState<Tab>('coaches')
  const [aiMessage, setAiMessage] = useState('')
  const [aiThread, setAiThread]   = useState<{ role: 'user' | 'ai'; text: string }[]>([])
  const [aiLoading, setAiLoading] = useState(false)

  async function askAI() {
    if (!aiMessage.trim()) return
    const msg = aiMessage.trim()
    setAiMessage('')
    setAiThread(t => [...t, { role: 'user', text: msg }])
    setAiLoading(true)
    try {
      const res  = await fetch('/api/ai/coach', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ message: msg, mode: 'advice' }),
      })
      const data = await res.json()
      setAiThread(t => [...t, { role: 'ai', text: data.response ?? data.error ?? 'No response' }])
    } catch {
      setAiThread(t => [...t, { role: 'ai', text: 'Something went wrong. Try again.' }])
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <div className="min-h-screen pb-28" style={{ background: 'var(--color-bg)' }}>

      {/* Header */}
      <div className="px-4 pt-14 pb-0 sticky top-0 z-40 border-b"
        style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)' }}>
        <div className="max-w-lg mx-auto">
          <h1 className="font-display text-2xl mb-3" style={{ color: 'var(--color-text-primary)' }}>
            Explore
          </h1>
          {/* Tab nav */}
          <div className="flex gap-1 rounded-xl p-1 mb-0" style={{ background: 'var(--color-surface)' }}>
            {([
              { id: 'coaches', label: '👤 Coaches' },
              { id: 'plans',   label: '📋 Plans' },
              { id: 'ai',      label: '🧠 AI Coach' },
            ] as { id: Tab; label: string }[]).map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                  tab === t.id
                    ? 'text-white'
                    : 'text-[var(--color-text-tertiary)]'
                }`}
                style={tab === t.id ? { background: 'var(--ns-ember)' } : {}}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4 space-y-4">

        {/* ── COACHES TAB ── */}
        {tab === 'coaches' && (
          <>
            {coaches.length === 0 ? (
              <div className="rounded-2xl p-8 text-center" style={{ background: 'var(--color-surface)' }}>
                <div className="text-4xl mb-3">🏃</div>
                <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
                  No verified coaches yet
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
                  Coaches are coming soon. Check back after launch.
                </p>
              </div>
            ) : (
              coaches.map(coach => (
                <Link key={coach.user_id} href={`/coach/${coach.slug}`}
                  className="flex items-center gap-4 rounded-2xl p-4 border transition-all active:scale-[0.98]"
                  style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl flex-shrink-0"
                    style={{ background: 'var(--color-surface-2)' }}>
                    {coach.photo_url
                      ? <img src={coach.photo_url} className="w-12 h-12 rounded-full object-cover" alt="" />
                      : '🏃'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
                        {coach.display_name}
                      </p>
                      {coach.verified && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                          style={{ background: 'var(--ns-ember)', color: 'white' }}>✓ Verified</span>
                      )}
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
                      Professional Coach · Plans available
                    </p>
                  </div>
                  <span style={{ color: 'var(--ns-ember)' }}>→</span>
                </Link>
              ))
            )}

            {/* Browse all coaches */}
            <a href="/coaches"
              className="flex items-center justify-between w-full rounded-2xl px-4 py-3 transition-all active:scale-95"
              style={{ background: 'var(--color-surface)', border: '1px solid #1e3a5f40' }}>
              <div className="flex items-center gap-2">
                <span className="text-lg">🔍</span>
                <div>
                  <p className="text-sm font-bold text-left" style={{ color: 'var(--color-text-primary)' }}>Browse all coaches</p>
                  <p className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>Filter by specialty, distance & price</p>
                </div>
              </div>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ color: 'var(--color-text-tertiary)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </a>

            {/* CTA for coaches */}
            <div className="rounded-2xl p-4 border" style={{ background: 'var(--color-surface-2)', borderColor: 'var(--color-border)' }}>
              <p className="text-xs font-bold mb-1" style={{ color: 'var(--color-text-tertiary)' }}>Are you a coach?</p>
              <p className="text-xs mb-3" style={{ color: 'var(--color-text-secondary)' }}>
                Join NextSplit as a Professional Coach — build plans, manage athletes, earn revenue.
              </p>
              <Link href="/coach/setup"
                className="inline-block text-xs font-bold px-4 py-2 rounded-xl"
                style={{ background: 'var(--ns-ember)', color: 'white' }}>
                Apply to coach →
              </Link>
            </div>
          </>
        )}

        {/* ── PLANS TAB ── */}
        {tab === 'plans' && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>
                Coach Plans
              </p>
              <Link href="/marketplace" className="text-xs font-bold" style={{ color: 'var(--ns-ember)' }}>
                Browse all →
              </Link>
            </div>

            {featuredPlans.length === 0 ? (
              <div className="rounded-2xl p-8 text-center" style={{ background: 'var(--color-surface)' }}>
                <div className="text-4xl mb-3">📋</div>
                <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
                  No coach plans yet
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
                  Coach-authored plans will appear here once coaches publish them.
                </p>
              </div>
            ) : (
              featuredPlans.map(plan => {
                const meta = plan.meta as AnyRecord ?? {}
                return (
                  <div key={plan.id} className="rounded-2xl p-4 border"
                    style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${LEVEL_PILL[plan.level] ?? ''}`}>
                            {plan.level}
                          </span>
                          <span className="text-[10px] font-bold" style={{ color: 'var(--color-text-tertiary)' }}>
                            {plan.distance}
                          </span>
                        </div>
                        <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>{plan.name}</p>
                        {plan.subtitle && (
                          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{plan.subtitle}</p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-lg font-black font-data" style={{ color: 'var(--color-text-primary)' }}>
                          {plan.weeks_min}
                        </p>
                        <p className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>weeks</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex gap-3">
                        {plan.peak_km_week && (
                          <span className="text-[10px] font-data" style={{ color: 'var(--color-text-tertiary)' }}>
                            {plan.peak_km_week}km peak
                          </span>
                        )}
                        {plan.avg_rating && plan.review_count > 0 && (
                          <span className="text-[10px]" style={{ color: 'var(--ns-track)' }}>
                            ★ {(plan.avg_rating as number).toFixed(1)}
                          </span>
                        )}
                        {meta.price_gbp && (
                          <span className="text-[10px] font-bold" style={{ color: 'var(--ns-track)' }}>
                            £{meta.price_gbp}
                          </span>
                        )}
                      </div>
                      <Link href={`/marketplace`}
                        className="text-xs font-bold px-3 py-1.5 rounded-xl"
                        style={{ background: 'var(--color-surface-2)', color: 'var(--ns-ember)' }}>
                        View →
                      </Link>
                    </div>
                  </div>
                )
              })
            )}
          </>
        )}

        {/* ── AI COACH TAB ── */}
        {tab === 'ai' && (
          <div className="space-y-4">
            <div className="rounded-2xl p-4" style={{ background: 'var(--color-surface)' }}>
              <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--ns-ember)' }}>
                AI Coaching
              </p>
              <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                Ask anything about your training — pacing strategy, injury prevention, race prep, adaptation.
                {!activePlanId && ' Activate a plan first for personalised advice.'}
              </p>
            </div>

            {/* Starter prompts */}
            {aiThread.length === 0 && (
              <div className="grid grid-cols-2 gap-2">
                {[
                  'How do I pace a 10K?',
                  'When should I take a rest week?',
                  'How do I prevent shin splints?',
                  'What should I eat before a long run?',
                ].map(prompt => (
                  <button key={prompt}
                    onClick={() => { setAiMessage(prompt); }}
                    className="text-left text-xs p-3 rounded-xl border transition-all"
                    style={{
                      background: 'var(--color-surface-2)',
                      borderColor: 'var(--color-border)',
                      color: 'var(--color-text-secondary)',
                    }}>
                    {prompt}
                  </button>
                ))}
              </div>
            )}

            {/* Thread */}
            {aiThread.length > 0 && (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {aiThread.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl px-3 py-2.5 text-xs leading-relaxed ${
                      msg.role === 'user' ? 'rounded-br-sm' : 'rounded-bl-sm'
                    }`}
                      style={msg.role === 'user'
                        ? { background: 'var(--ns-ember)', color: 'white' }
                        : { background: 'var(--color-surface-2)', color: 'var(--color-text-primary)' }
                      }>
                      {msg.text}
                    </div>
                  </div>
                ))}
                {aiLoading && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl rounded-bl-sm px-3 py-2.5 text-xs"
                      style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-tertiary)' }}>
                      Thinking…
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Input */}
            <div className="flex gap-2">
              <input
                value={aiMessage}
                onChange={e => setAiMessage(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && askAI()}
                placeholder="Ask your AI coach…"
                className="flex-1 text-sm px-4 py-3 rounded-2xl outline-none"
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border-2)',
                  color: 'var(--color-text-primary)',
                }}
              />
              <button
                onClick={askAI}
                disabled={!aiMessage.trim() || aiLoading}
                className="px-4 py-3 rounded-2xl font-bold text-sm text-white disabled:opacity-40 transition-all"
                style={{ background: 'var(--ns-ember)' }}>
                →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
