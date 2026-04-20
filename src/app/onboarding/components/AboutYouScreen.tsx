'use client'

import { useState } from 'react'
import { useOnboarding } from '../context/OnboardingContext'
import { OnboardingProgressBar } from './OnboardingProgressBar'
import { createClient } from '@/lib/supabase/client'
import { db } from '@/lib/supabase/db'

const INJURY_OPTIONS = ['Knee', 'Hip', 'Back', 'Foot / Ankle', 'Shin splints', 'IT band', 'Achilles', 'None']
const HEALTH_OPTIONS = [
  { id: 'heart',    label: '❤️ Heart condition' },
  { id: 'asthma',   label: '🌬️ Asthma' },
  { id: 'diabetes', label: '🩸 Diabetes' },
  { id: 'none',     label: '✓ None of the above' },
  { id: 'pnts',     label: '🔒 Prefer not to say' },
]

function TogglePill({ label, selected, onToggle }: { label: string; selected: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
        selected ? 'bg-teal-500 text-white border-teal-500' : 'bg-white text-slate-600 border-slate-200 hover:border-teal-300'
      }`}
    >
      {label}
    </button>
  )
}

export function AboutYouScreen() {
  const { step, data, update, next, back } = useOnboarding()

  const [displayName, setDisplayName] = useState(data.displayName)
  const [age, setAge]                 = useState<string>(data.age ? String(data.age) : '')
  const [sex, setSex]                 = useState(data.biologicalSex)
  const [injuries, setInjuries]       = useState<string[]>(
    data.injuryNotes ? data.injuryNotes.split(',').map(s => s.trim()) : []
  )
  const [injuryFreeText, setInjuryFreeText] = useState('')
  const [healthFlags, setHealthFlags] = useState<string[]>(data.healthFlags)
  const [saving, setSaving]           = useState(false)

  const toggleInjury = (val: string) => {
    if (val === 'None') { setInjuries([]); return }
    setInjuries(prev => prev.includes(val) ? prev.filter(i => i !== val) : [...prev, val])
  }

  const toggleHealth = (id: string) => {
    if (id === 'none' || id === 'pnts') { setHealthFlags([id]); return }
    setHealthFlags(prev => {
      const filtered = prev.filter(h => h !== 'none' && h !== 'pnts')
      return filtered.includes(id) ? filtered.filter(h => h !== id) : [...filtered, id]
    })
  }

  const canContinue = displayName.trim().length >= 2

  const handleContinue = async () => {
    if (!canContinue) return
    setSaving(true)
    const injuryNotes = [...injuries, injuryFreeText].filter(Boolean).join(', ')
    update({
      displayName: displayName.trim(),
      age: age ? parseInt(age) : null,
      biologicalSex: sex,
      injuryNotes,
      healthFlags,
    })
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await db(supabase).from('profiles').update({
        display_name: displayName.trim(),
        age: age ? parseInt(age) : null,
        biological_sex: sex,
        injury_notes: injuryNotes,
        health_flags: healthFlags,
        onboarding_step: 4,
      }).eq('id', user.id)
    }
    setSaving(false)
    next()
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <OnboardingProgressBar step={step} character={data.characterConfig} showFinishLine />

      <div className="flex-1 overflow-y-auto pb-32 px-4 pt-6 space-y-4">
        <div className="mb-2">
          <h1 className="text-xl font-black text-slate-900">About you</h1>
          <p className="text-sm text-slate-500 mt-1">Helps us personalise your training load and recommendations.</p>
        </div>

        {/* Name */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Your name</label>
          <input
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            placeholder="How should we address you?"
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-colors"
          />
        </div>

        {/* Age + Sex */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Age</label>
            <input
              type="number"
              value={age}
              onChange={e => setAge(e.target.value)}
              placeholder="e.g. 32"
              min={13} max={99}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-colors"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Biological sex</label>
            <p className="text-xs text-slate-400">Used to calculate training load defaults — optional</p>
            <div className="flex gap-2">
              {(['male', 'female', 'prefer_not_to_say'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setSex(s)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                    sex === s ? 'bg-teal-500 text-white border-teal-500' : 'bg-white text-slate-600 border-slate-200'
                  }`}
                >
                  {s === 'prefer_not_to_say' ? 'Prefer not to say' : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Injuries */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Current injuries or niggles</label>
          <p className="text-xs text-slate-400">We&apos;ll factor these into your plan — be honest, it helps</p>
          <div className="flex flex-wrap gap-2">
            {INJURY_OPTIONS.map(o => (
              <TogglePill
                key={o}
                label={o}
                selected={o === 'None' ? injuries.length === 0 : injuries.includes(o)}
                onToggle={() => toggleInjury(o)}
              />
            ))}
          </div>
          {injuries.length > 0 && injuries[0] !== 'None' && (
            <input
              value={injuryFreeText}
              onChange={e => setInjuryFreeText(e.target.value)}
              placeholder="Any more detail? (optional)"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:border-teal-400 transition-colors"
            />
          )}
        </div>

        {/* Health flags */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Health conditions</label>
          <p className="text-xs text-slate-400">We never share this — it&apos;s just so your plan is appropriate</p>
          <div className="space-y-2">
            {HEALTH_OPTIONS.map(o => (
              <button
                key={o.id}
                onClick={() => toggleHealth(o.id)}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-sm border transition-all ${
                  healthFlags.includes(o.id)
                    ? 'bg-teal-50 border-teal-400 text-teal-800 font-semibold'
                    : 'bg-white border-slate-200 text-slate-700'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-4 py-4 flex gap-3">
        <button onClick={back} className="px-5 py-3 rounded-2xl border border-slate-200 text-sm font-semibold text-slate-600">←</button>
        <button
          onClick={handleContinue}
          disabled={!canContinue || saving}
          className="flex-1 bg-teal-500 text-white py-3 rounded-2xl text-sm font-bold disabled:opacity-50 transition-all hover:bg-teal-600 active:scale-95"
        >
          {saving ? 'Saving…' : 'Continue →'}
        </button>
      </div>
    </div>
  )
}
