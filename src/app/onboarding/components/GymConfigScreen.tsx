'use client'

import { useState } from 'react'
import { useOnboarding } from '../context/OnboardingContext'
import { OnboardingProgressBar } from './OnboardingProgressBar'
import { createClient } from '@/lib/supabase/client'
import { db } from '@/lib/supabase/db'

const EQUIPMENT_OPTIONS = [
  { id: 'commercial',  label: '🏢 Commercial gym',    desc: 'Full machine and free weight access' },
  { id: 'home_weights',label: '🏠 Home gym (weights)', desc: 'Dumbbells, barbell, bench at home' },
  { id: 'bodyweight',  label: '🤸 Bodyweight only',   desc: 'No equipment — floor, wall, bodyweight' },
  { id: 'bands',       label: '🔁 Resistance bands',  desc: 'Bands and light portable kit' },
]

const FOCUS_OPTIONS = [
  { id: 'runner_specific', label: '🏃 Runner-specific',  desc: 'Hip strength, glutes, stability, injury prevention' },
  { id: 'general',         label: '💪 General strength', desc: 'Full body strength and conditioning' },
  { id: 'hypertrophy',     label: '📈 Build muscle',     desc: 'Progressive overload, volume-focused' },
  { id: 'rehab',           label: '🩹 Rehab & prehab',   desc: 'Recovery-focused, low impact' },
] as const

export function GymConfigScreen() {
  const { step, data, update, next, back } = useOnboarding()

  const [gymEnabled, setGymEnabled]           = useState(data.gymEnabled)
  const [sessionsPerWeek, setSessionsPerWeek]  = useState(data.gymSessionsPerWeek)
  const [equipment, setEquipment]             = useState<string[]>(data.gymEquipment)
  const [focus, setFocus]                     = useState(data.gymFocus)
  const [saving, setSaving]                   = useState(false)

  const toggleEquipment = (id: string) => {
    setEquipment(prev => prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id])
  }

  const canContinue = !gymEnabled || (equipment.length > 0 && !!focus)

  const handleContinue = async () => {
    setSaving(true)
    update({
      gymEnabled,
      gymSessionsPerWeek: sessionsPerWeek,
      gymEquipment: equipment,
      gymFocus: focus,
    })
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await db(supabase).from('profiles').update({
        gym_enabled: gymEnabled,
        gym_sessions_per_week: sessionsPerWeek,
        gym_equipment: equipment,
        gym_focus: focus,
        onboarding_step: 8,
      }).eq('id', user.id)
    }
    setSaving(false)
    next()
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--color-bg)" }}>
      <OnboardingProgressBar step={step} character={data.characterConfig} showFinishLine />

      <div className="flex-1 overflow-y-auto pb-32 px-4 pt-6 space-y-4">
        <div className="mb-2">
          <h1 className="text-xl font-black" style={{ color: 'var(--color-text-primary)' }}>Gym & strength</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>Strength training is built into every plan — it makes you a better, more resilient runner.</p>
        </div>

        {/* Toggle */}
        <div className="rounded-2xl p-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>Include gym sessions?</p>
              <p className="text-xs text-gray-400 mt-0.5">You can turn this on or off any time</p>
            </div>
            <button
              onClick={() => setGymEnabled(!gymEnabled)}
              className={`relative w-12 h-6 rounded-full transition-all ${gymEnabled ? 'bg-[var(--ns-forest)]' : 'bg-slate-300'}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${gymEnabled ? 'left-6' : 'left-0.5'}`} />
            </button>
          </div>
          {!gymEnabled && (
            <p className="text-xs text-amber-600 mt-3 bg-amber-50 rounded-xl px-3 py-2">
              💡 Gym sessions will be hidden but generated in the background — flip the switch anytime to activate them
            </p>
          )}
        </div>

        {gymEnabled && (
          <>
            {/* Sessions per week */}
            <div className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>Gym sessions per week</label>
              <div className="flex gap-3">
                {[1, 2, 3].map(n => (
                  <button
                    key={n}
                    onClick={() => setSessionsPerWeek(n)}
                    className={`flex-1 py-3 rounded-xl text-sm font-black border transition-all ${
                      sessionsPerWeek === n ? 'bg-[var(--ns-forest)] text-white border-[var(--ns-forest)]' : 'bg-white text-gray-600 border-gray-200'
                    }`}
                  >
                    {n}x
                  </button>
                ))}
              </div>
              <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                {sessionsPerWeek === 1 && 'One session covers the essentials without adding too much fatigue'}
                {sessionsPerWeek === 2 && 'Two sessions is the sweet spot for most runners — recommended'}
                {sessionsPerWeek === 3 && 'Three sessions for those who want to prioritise strength alongside running'}
              </p>
            </div>

            {/* Equipment */}
            <div className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>What equipment do you have?</label>
                <p className="text-xs text-gray-400 mt-1">Select all that apply — we&apos;ll build sessions around what you have</p>
              </div>
              <div className="space-y-2">
                {EQUIPMENT_OPTIONS.map(o => (
                  <button
                    key={o.id}
                    onClick={() => toggleEquipment(o.id)}
                    className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                      equipment.includes(o.id) ? 'bg-[var(--ns-forest-light)] border-[var(--ns-forest)]' : 'bg-white border-gray-200'
                    }`}
                  >
                    <p className={`text-sm font-bold ${equipment.includes(o.id) ? 'text-white' : 'text-gray-700'}`}>
                      {o.label}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{o.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Focus */}
            <div className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>Training focus</label>
              <div className="space-y-2">
                {FOCUS_OPTIONS.map(o => (
                  <button
                    key={o.id}
                    onClick={() => setFocus(o.id)}
                    className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                      focus === o.id ? 'bg-[var(--ns-forest-light)] border-[var(--ns-forest)]' : 'bg-white border-gray-200'
                    }`}
                  >
                    <p className={`text-sm font-bold ${focus === o.id ? 'text-white' : 'text-gray-700'}`}>{o.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{o.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Nav */}
      <div className="fixed bottom-0 left-0 right-0 px-4 py-4 flex gap-3 border-t" style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)' }}>
        <button onClick={back} className="px-5 py-3 rounded-2xl border border-gray-200 text-sm font-semibold text-gray-600">←</button>
        <button
          onClick={handleContinue}
          disabled={!canContinue || saving}
          className="flex-1 py-3 rounded-2xl text-sm font-bold text-white disabled:opacity-50 transition-all active:scale-95" style={{ background: 'var(--ns-ember)' }}
        >
          {saving ? 'Saving…' : canContinue ? 'Continue →' : 'Select equipment and focus to continue'}
        </button>
      </div>
    </div>
  )
}
