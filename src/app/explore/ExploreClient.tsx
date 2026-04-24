'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSquad } from '@/hooks/useSquad'
import { useSubscription } from '@/hooks/useSubscription'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>

interface Props {
  coaches:       AnyRecord[]
  featuredPlans: AnyRecord[]
  activePlanId:  string | null
}

type Tab = 'coaches' | 'squads' | 'plans' | 'ai'

const TABS: { id: Tab; label: string; colour: string }[] = [
  { id: 'coaches', label: '🎓 Coaches', colour: '#8b5cf6' },
  { id: 'squads',  label: '👥 Squads',  colour: '#84cc16' },
  { id: 'plans',   label: '📋 Plans',   colour: '#2563eb' },
  { id: 'ai',      label: '🧠 AI',      colour: '#06b6d4' },
]

export default function ExploreClient({ coaches, featuredPlans, activePlanId }: Props) {
  const [tab, setTab]             = useState<Tab>('coaches')
  const [aiMessage, setAiMessage] = useState('')
  const [aiThread, setAiThread]   = useState<{ role: 'user' | 'ai'; text: string }[]>([])
  const [aiLoading, setAiLoading] = useState(false)
  const { squad }                 = useSquad()
  const { isPro }                 = useSubscription()

  const activeTab = TABS.find(t => t.id === tab)!

  async function askAI() {
    if (!aiMessage.trim()) return
    const msg = aiMessage.trim()
    setAiMessage('')
    setAiThread(t => [...t, { role: 'user', text: msg }])
    setAiLoading(true)
    try {
      const res  = await fetch('/api/ai/coach', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, mode: 'advice' }),
      })
      const data = await res.json()
      setAiThread(t => [...t, { role: 'ai', text: data.response ?? data.error ?? 'No response' }])
    } catch {
      setAiThread(t => [...t, { role: 'ai', text: 'Something went wrong. Try again.' }])
    } finally { setAiLoading(false) }
  }

  return (
    <div className="min-h-screen pb-28" style={{ background: 'var(--color-bg)' }}>

      {/* ── Header ── */}
      <div className="sticky top-0 z-40 border-b"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <div className="max-w-lg mx-auto px-4 pt-12 pb-0">
          <h1 className="text-xl font-black mb-3" style={{ color: 'var(--color-text-primary)', letterSpacing: '-0.02em' }}>
            Explore
          </h1>
          {/* Tab pills */}
          <div className="flex gap-1.5 pb-0 overflow-x-auto scrollbar-none">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className="flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all"
                style={tab === t.id
                  ? { background: t.colour, color: 'white' }
                  : { background: 'var(--color-surface-2)', color: 'var(--color-text-tertiary)' }
                }>
                {t.label}
              </button>
            ))}
          </div>
          {/* Active tab colour bar */}
          <div className="h-0.5 mt-3" style={{ background: activeTab.colour, opacity: 0.4, borderRadius: 2 }} />
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4 space-y-3">

        {/* ══ COACHES ══ */}
        {tab === 'coaches' && (
          <>
            <div className="rounded-2xl p-4" style={{ background: 'rgba(139,92,246,0.08)', border: '1.5px solid rgba(139,92,246,0.2)' }}>
              <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: '#8b5cf6' }}>
                Verified coaches
              </p>
              <p className="text-sm font-black text-white mb-0.5">Your coach, in the same app.</p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
                They see your logs, ACWR, wellness — and coach you without the WhatsApp chaos.
              </p>
            </div>

            {coaches.length === 0 ? (
              <div className="rounded-2xl p-8 text-center" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <div className="text-4xl mb-3">🎓</div>
                <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>Coaches coming soon</p>
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>Be first to apply as a coach →</p>
              </div>
            ) : coaches.map(coach => (
              <Link key={coach.user_id} href={`/coach/${coach.slug}`}
                className="flex items-center gap-4 rounded-2xl p-4 active:scale-[0.98] transition-all"
                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <div className="w-12 h-12 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center"
                  style={{ background: 'rgba(139,92,246,0.15)', border: '2px solid rgba(139,92,246,0.3)' }}>
                  {coach.photo_url
                    ? <img src={coach.photo_url} className="w-full h-full object-cover" alt="" />
                    : <span className="text-xl">🎓</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-black" style={{ color: 'var(--color-text-primary)' }}>{coach.display_name}</p>
                    {coach.verified && (
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full"
                        style={{ background: '#8b5cf6', color: 'white' }}>✓ Verified</span>
                    )}
                  </div>
                  <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>Tap to view profile & hire</p>
                </div>
                <span style={{ color: '#8b5cf6' }}>→</span>
              </Link>
            ))}

            <Link href="/coaches"
              className="flex items-center justify-between rounded-2xl px-4 py-3.5 active:scale-[0.98] transition-all"
              style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)' }}>
              <div>
                <p className="text-sm font-black" style={{ color: '#8b5cf6' }}>Browse all coaches</p>
                <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>Filter by specialty, distance & price</p>
              </div>
              <span style={{ color: '#8b5cf6' }}>→</span>
            </Link>

            {/* Become a coach CTA */}
            <div className="rounded-2xl p-4" style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
              <p className="text-xs font-black mb-1" style={{ color: 'var(--color-text-tertiary)' }}>Are you a coach?</p>
              <p className="text-xs mb-3" style={{ color: 'var(--color-text-secondary)' }}>
                Build plans, manage athletes, earn revenue — all inside NextSplit.
              </p>
              <Link href="/coach/setup"
                className="inline-block text-xs font-black px-4 py-2 rounded-xl text-white"
                style={{ background: '#8b5cf6' }}>
                Apply to coach →
              </Link>
            </div>
          </>
        )}

        {/* ══ SQUADS ══ */}
        {tab === 'squads' && (
          <>
            <div className="rounded-2xl p-4" style={{ background: 'rgba(132,204,22,0.08)', border: '1.5px solid rgba(132,204,22,0.25)' }}>
              <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: '#84cc16' }}>
                Split Leader system
              </p>
              <p className="text-sm font-black text-white mb-0.5">Train together. Go further.</p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
                Weekly leaderboards, collective km goals, nudges, season standings. Accountability that actually works.
              </p>
            </div>

            {/* User's current squad */}
            {squad ? (
              <Link href="/squad"
                className="flex items-center gap-3 rounded-2xl p-4 active:scale-[0.98] transition-all"
                style={{ background: `${squad.colour ?? '#84cc16'}12`, border: `1.5px solid ${squad.colour ?? '#84cc16'}35` }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                  style={{ background: `${squad.colour ?? '#84cc16'}20` }}>
                  👥
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black" style={{ color: squad.colour ?? '#84cc16' }}>{squad.name}</p>
                  <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>Your squad · Tap to open →</p>
                </div>
              </Link>
            ) : (
              <>
                {/* Create or join */}
                <div className="grid grid-cols-2 gap-2">
                  <Link href="/squad/create"
                    className="rounded-2xl p-4 text-center active:scale-[0.97] transition-all"
                    style={{ background: 'rgba(132,204,22,0.10)', border: '1.5px solid rgba(132,204,22,0.3)' }}>
                    <div className="text-2xl mb-2">👑</div>
                    <p className="text-sm font-black" style={{ color: '#84cc16' }}>Start a squad</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>Invite your running crew</p>
                  </Link>
                  <Link href="/squad/join"
                    className="rounded-2xl p-4 text-center active:scale-[0.97] transition-all"
                    style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                    <div className="text-2xl mb-2">🔗</div>
                    <p className="text-sm font-black" style={{ color: 'var(--color-text-primary)' }}>Join a squad</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>Enter your invite code</p>
                  </Link>
                </div>
              </>
            )}

            {/* What squads get */}
            <div className="rounded-2xl p-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <p className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: 'var(--color-text-tertiary)' }}>
                What squads get
              </p>
              <div className="space-y-2.5">
                {[
                  { icon: '🏆', title: 'Weekly leaderboard', desc: 'Who ran the most this week' },
                  { icon: '🎯', title: 'Collective km goals', desc: 'Hit targets together as a team' },
                  { icon: '👋', title: 'Nudge system', desc: 'One tap to motivate an inactive member' },
                  { icon: '🏅', title: 'Season standings', desc: 'Monthly XP resets — everyone has a shot' },
                ].map(f => (
                  <div key={f.title} className="flex items-start gap-3">
                    <span className="text-lg flex-shrink-0">{f.icon}</span>
                    <div>
                      <p className="text-xs font-bold" style={{ color: 'var(--color-text-primary)' }}>{f.title}</p>
                      <p className="text-[11px]" style={{ color: 'var(--color-text-tertiary)' }}>{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ══ PLANS ══ */}
        {tab === 'plans' && (
          <>
            <div className="rounded-2xl p-4" style={{ background: 'rgba(37,99,235,0.08)', border: '1.5px solid rgba(37,99,235,0.2)' }}>
              <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: '#2563eb' }}>
                Coach marketplace
              </p>
              <p className="text-sm font-black text-white mb-0.5">Plans built by real coaches.</p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
                Buy a plan from a verified coach and run it in the app. All stats, logging, and AI coaching included.
              </p>
            </div>

            {/* Premium upsell if free */}
            {!isPro && (
              <div className="rounded-2xl p-4" style={{ background: 'rgba(240,165,0,0.08)', border: '1.5px solid rgba(240,165,0,0.25)' }}>
                <div className="flex items-start gap-3">
                  <span className="text-2xl flex-shrink-0">⭐</span>
                  <div className="flex-1">
                    <p className="text-sm font-black" style={{ color: '#f0a500' }}>Elite — £7.99/mo</p>
                    <p className="text-xs mt-0.5 mb-2" style={{ color: 'var(--color-text-tertiary)' }}>
                      Unlock AI coaching, ACWR analytics, adaptive plan engine, and coach marketplace. Founding price.
                    </p>
                    <Link href="/settings"
                      className="inline-block text-xs font-black px-4 py-2 rounded-xl text-white"
                      style={{ background: '#f0a500' }}>
                      Upgrade to Elite →
                    </Link>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <p className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--color-text-tertiary)' }}>
                Featured plans
              </p>
              <Link href="/marketplace" className="text-xs font-bold" style={{ color: '#2563eb' }}>
                Browse all →
              </Link>
            </div>

            {featuredPlans.length === 0 ? (
              <div className="rounded-2xl p-8 text-center" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <div className="text-4xl mb-3">📋</div>
                <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>No coach plans yet</p>
                <p className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>Plans appear here once coaches publish them.</p>
              </div>
            ) : featuredPlans.map(plan => (
              <Link key={plan.id} href={`/marketplace`}
                className="block rounded-2xl p-4 active:scale-[0.98] transition-all"
                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(37,99,235,0.12)', color: '#2563eb' }}>
                        {plan.level}
                      </span>
                      <span className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>{plan.distance}</span>
                    </div>
                    <p className="text-sm font-black" style={{ color: 'var(--color-text-primary)' }}>{plan.name}</p>
                    {plan.subtitle && (
                      <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{plan.subtitle}</p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xl font-black" style={{ color: '#2563eb' }}>{plan.weeks_min}w</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {plan.peak_km_week && (
                    <span className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>{plan.peak_km_week}km peak week</span>
                  )}
                  {plan.avg_rating > 0 && plan.review_count > 0 && (
                    <span className="text-[10px]" style={{ color: '#f0a500' }}>★ {Number(plan.avg_rating).toFixed(1)}</span>
                  )}
                </div>
              </Link>
            ))}
          </>
        )}

        {/* ══ AI COACH ══ */}
        {tab === 'ai' && (
          <div className="space-y-3">
            <div className="rounded-2xl p-4" style={{ background: 'rgba(6,182,212,0.08)', border: '1.5px solid rgba(6,182,212,0.2)' }}>
              <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: '#06b6d4' }}>AI Coaching</p>
              <p className="text-sm font-black text-white mb-0.5">Ask anything about your training.</p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
                Pacing strategy, injury prevention, race prep, recovery. Your training data gives it context.
              </p>
            </div>

            {aiThread.length === 0 && (
              <div className="grid grid-cols-2 gap-2">
                {[
                  'How do I pace my first 10K?',
                  'When should I take a rest week?',
                  'How do I prevent shin splints?',
                  'What to eat before a long run?',
                ].map(prompt => (
                  <button key={prompt}
                    onClick={() => setAiMessage(prompt)}
                    className="text-left text-xs p-3 rounded-xl transition-all"
                    style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
                    {prompt}
                  </button>
                ))}
              </div>
            )}

            {aiThread.length > 0 && (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {aiThread.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className="max-w-[85%] rounded-2xl px-3 py-2.5 text-xs leading-relaxed"
                      style={msg.role === 'user'
                        ? { background: '#06b6d4', color: 'white' }
                        : { background: 'var(--color-surface)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' }
                      }>
                      {msg.text}
                    </div>
                  </div>
                ))}
                {aiLoading && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl px-3 py-2.5 text-xs"
                      style={{ background: 'var(--color-surface)', color: 'var(--color-text-tertiary)' }}>
                      Thinking…
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <input
                value={aiMessage}
                onChange={e => setAiMessage(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && askAI()}
                placeholder="Ask your AI coach…"
                className="flex-1 text-sm px-4 py-3 rounded-2xl outline-none"
                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border-2)', color: 'var(--color-text-primary)' }}
              />
              <button onClick={askAI} disabled={!aiMessage.trim() || aiLoading}
                className="px-4 py-3 rounded-2xl font-black text-sm text-white disabled:opacity-40"
                style={{ background: '#06b6d4' }}>
                →
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
