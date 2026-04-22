'use client'

import { useState } from 'react'
import { useOnboarding } from '../context/OnboardingContext'
import { OnboardingProgressBar } from './OnboardingProgressBar'
import { SPORTS } from '@/types/database'
import type { SportId } from '@/types/database'
import { createClient } from '@/lib/supabase/client'
import { db } from '@/lib/supabase/db'

export function SportSelectScreen() {
  const { step, data, update, next, back } = useOnboarding()
  const [selected, setSelected]   = useState<SportId[]>(data.sportFocus)
  const [notified, setNotified]   = useState<string[]>([])
  const [saving, setSaving]       = useState(false)

  const toggle = (id: SportId) => {
    // Running always required if active
    if (id === 'running') return
    setSelected(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    )
  }

  const handleNotify = async (sport: string) => {
    if (notified.includes(sport)) { setNotified(prev => prev.filter(s => s !== sport)); return }
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await db(supabase).from('sport_interest_waitlist').upsert({ user_id: user.id, sport })
    setNotified(prev => [...prev, sport])
  }

  const handleContinue = async () => {
    setSaving(true)
    update({ sportFocus: selected })
    // Persist to Supabase incrementally
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await db(supabase).from('profiles').update({ sport_focus: selected, onboarding_step: 3 }).eq('id', user.id)
    }
    setSaving(false)
    next()
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--color-bg)" }}>
      <OnboardingProgressBar step={step} character={data.characterConfig} showFinishLine />

      <div className="flex-1 overflow-y-auto pb-32 px-4 pt-6">
        <div className="mb-6">
          <h1 className="text-xl font-black" style={{ color: "var(--color-text-primary)" }}>What are you training for?</h1>
          <p className="text-sm text-gray-500 mt-1">Running is your foundation. Add more anytime.</p>
        </div>

        <div className="space-y-3">
          {SPORTS.map(sport => {
            const isSelected = selected.includes(sport.id)
            const isNotified = notified.includes(sport.id)

            return (
              <div
                key={sport.id}
                className="rounded-2xl border p-4 transition-all"
                style={{
                  background: isSelected ? 'var(--color-surface-2)' : 'var(--color-surface)',
                  borderColor: isSelected ? 'var(--ns-forest)' : 'var(--color-border)',
                  opacity: sport.active ? 1 : 0.6,
                }}
              >
                <div className="flex items-center gap-3">
                  {/* Emoji */}
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                    style={{ background: isSelected ? 'rgba(43,92,63,0.3)' : 'var(--color-surface-2)' }}>
                    {sport.emoji}
                  </div>

                  {/* Label */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold" style={{ color: "var(--color-text-primary)" }}>{sport.label}</p>
                      {sport.id === 'running' && (
                        <span className="text-[9px] font-bold text-white bg-[var(--ns-forest)] px-1.5 py-0.5 rounded-full">
                          Core
                        </span>
                      )}
                      {!sport.active && (
                        <span className="text-[9px] font-bold text-gray-500 bg-gray-200 px-1.5 py-0.5 rounded-full">
                          Coming soon
                        </span>
                      )}
                    </div>
                    {sport.id === 'gym' && (
                      <p className="text-xs mt-0.5" style={{ color: "var(--color-text-tertiary)" }}>Included in all plans by default</p>
                    )}
                    {sport.id === 'running' && (
                      <p className="text-xs mt-0.5" style={{ color: "var(--color-text-tertiary)" }}>Always included as your primary sport</p>
                    )}
                  </div>

                  {/* Action */}
                  {sport.active ? (
                    <button
                      onClick={() => toggle(sport.id)}
                      disabled={sport.id === 'running'}
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                        isSelected
                          ? 'bg-[var(--ns-forest)] border-[var(--ns-forest)]'
                          : 'border-slate-300'
                      }`}
                    >
                      {isSelected && <span className="text-white text-xs font-bold">✓</span>}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleNotify(sport.id)}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-all flex-shrink-0 ${
                        isNotified
                          ? 'bg-[var(--ns-forest-light)] border-teal-300 text-[var(--ns-forest)]'
                          : 'bg-white border-gray-200 text-gray-500 hover:border-[var(--ns-forest-light)]'
                      }`}
                    >
                      {isNotified ? '✓ Notify me' : 'Notify me'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <p className="text-xs mt-4 text-center" style={{ color: "var(--color-text-tertiary)" }}>
          You can add more sports to your profile at any time
        </p>
      </div>

      {/* Nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-4 flex gap-3">
        <button onClick={back} className="px-5 py-3 rounded-2xl border border-gray-200 text-sm font-semibold text-gray-600">
          ←
        </button>
        <button
          onClick={handleContinue}
          disabled={saving}
          className="flex-1 py-3 rounded-2xl text-sm font-bold text-white disabled:opacity-50 transition-all active:scale-95" style={{ background: 'var(--ns-ember)' }}
        >
          {saving ? 'Saving…' : 'Continue →'}
        </button>
      </div>
    </div>
  )
}
