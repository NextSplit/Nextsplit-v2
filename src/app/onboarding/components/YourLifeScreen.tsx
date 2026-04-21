'use client'

import { useState } from 'react'
import { useOnboarding } from '../context/OnboardingContext'
import { OnboardingProgressBar } from './OnboardingProgressBar'
import { createClient } from '@/lib/supabase/client'
import { db } from '@/lib/supabase/db'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const LONG_RUN_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const RUN_TIMES = [
  { id: 'morning',   label: '🌅 Morning',   desc: 'Before 10am' },
  { id: 'lunchtime', label: '☀️ Lunchtime',  desc: '11am – 2pm' },
  { id: 'evening',   label: '🌆 Evening',    desc: 'After 5pm' },
  { id: 'varies',    label: '🔀 Varies',     desc: 'Different each day' },
] as const

export function YourLifeScreen() {
  const { step, data, update, next, back } = useOnboarding()

  const [trainingDays, setTrainingDays] = useState<string[]>(
    // Pre-fill default days based on data.trainingDays count
    DAYS.slice(0, data.trainingDays)
  )
  const [longRunDay, setLongRunDay]     = useState(data.preferredLongRunDay)
  const [runTime, setRunTime]           = useState(data.preferredRunTime)
  const [saving, setSaving]             = useState(false)

  const toggleDay = (day: string) => {
    setTrainingDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    )
  }

  const canContinue = trainingDays.length >= 1

  const handleContinue = async () => {
    if (!canContinue) return
    setSaving(true)
    update({
      trainingDays: trainingDays.length,
      preferredLongRunDay: longRunDay,
      preferredRunTime: runTime,
    })
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await db(supabase).from('profiles').update({
        training_days: trainingDays.length,
        preferred_long_run_day: longRunDay,
        preferred_run_time: runTime,
        onboarding_step: 7,
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
          {data.trainingPath === 'lifestyle' ? (
            <>
              <h1 className="text-xl font-black text-gray-900">What works for your life?</h1>
              <p className="text-sm text-gray-500 mt-1">
                No race goals, no pressure — just tell us when you can run and we&apos;ll build around that.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-xl font-black text-gray-900">Your life</h1>
              <p className="text-sm text-gray-500 mt-1">We build your plan around your schedule — not the other way round.</p>
            </>
          )}
        </div>

        {/* Training days */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Which days can you train?</label>
            <p className="text-xs text-slate-400 mt-1">Tap to select — we&apos;ll place rest days on the others</p>
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {DAYS.map(day => (
              <button
                key={day}
                onClick={() => toggleDay(day)}
                className={`py-3 rounded-xl text-xs font-black transition-all ${
                  trainingDays.includes(day)
                    ? 'bg-[var(--ns-forest)] text-white'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {day.charAt(0)}
              </button>
            ))}
          </div>
          <p className="text-xs font-semibold text-center" style={{ color: 'var(--ns-forest)' }}>
            {trainingDays.length} training {trainingDays.length === 1 ? 'day' : 'days'} selected
          </p>
        </div>

        {/* Enjoyment question — Lifestyle path only (Product Pillar spec) */}
        {data.trainingPath === 'lifestyle' && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">What do you enjoy most?</label>
              <p className="text-xs text-gray-400 mt-1">Shapes the type of sessions we suggest</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'easy_running',  label: '😌 Easy running',    desc: 'Comfortable, conversational' },
                { id: 'variety',       label: '🔀 Variety',          desc: 'Mix of different sessions' },
                { id: 'outdoors',      label: '🌿 Being outdoors',   desc: 'Nature over numbers' },
                { id: 'structure',     label: '📋 Some structure',   desc: 'A plan to follow' },
              ].map(opt => {
                const isOn = (data as { runningEnjoyment?: string }).runningEnjoyment === opt.id
                return (
                  <button key={opt.id}
                    onClick={() => update({ runningEnjoyment: opt.id } as never)}
                    className="py-3 px-3 rounded-2xl border-2 text-left transition-all"
                    style={isOn
                      ? { background: 'var(--ns-forest-light)', borderColor: 'var(--ns-forest)' }
                      : { background: 'white', borderColor: '#e5e7eb' }}>
                    <p className="text-xs font-bold text-gray-800">{opt.label}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{opt.desc}</p>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Long run day */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              {data.trainingPath === 'lifestyle' ? 'Best day for a longer run?' : 'Preferred long run day'}
            </label>
            <p className="text-xs text-gray-400 mt-1">Usually a weekend — when you have the most time</p>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {LONG_RUN_DAYS.map(day => (
              <button
                key={day}
                onClick={() => setLongRunDay(day)}
                className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
                  longRunDay === day ? 'bg-[var(--ns-forest)] text-white border-[var(--ns-forest)]' : 'bg-white text-slate-600 border-slate-200'
                }`}
              >
                {day.slice(0, 3)}
              </button>
            ))}
          </div>
        </div>

        {/* Run time preference */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">When do you typically train?</label>
          <div className="space-y-2">
            {RUN_TIMES.map(t => (
              <button
                key={t.id}
                onClick={() => setRunTime(t.id)}
                className={`w-full text-left px-4 py-3 rounded-xl border transition-all flex items-center gap-3 ${
                  runTime === t.id ? 'bg-[var(--ns-forest-light)] border-[var(--ns-forest)]' : 'bg-white border-slate-200'
                }`}
              >
                <span className="text-xl">{t.label.split(' ')[0]}</span>
                <div>
                  <p className={`text-sm font-bold ${runTime === t.id ? 'text-teal-800' : 'text-slate-700'}`}>
                    {t.label.split(' ').slice(1).join(' ')}
                  </p>
                  <p className="text-xs text-slate-400">{t.desc}</p>
                </div>
                {runTime === t.id && <span className="ml-auto text-[var(--ns-forest-mid)] font-bold">✓</span>}
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
          className="flex-1 bg-[var(--ns-forest)] text-white py-3 rounded-2xl text-sm font-bold disabled:opacity-50 transition-all hover:bg-[var(--ns-forest)] active:scale-95"
        >
          {saving ? 'Saving…' : 'Continue →'}
        </button>
      </div>
    </div>
  )
}
