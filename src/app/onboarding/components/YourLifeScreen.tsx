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
          <h1 className="text-xl font-black text-slate-900">Your life</h1>
          <p className="text-sm text-slate-500 mt-1">We build your plan around your schedule — not the other way round.</p>
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
                    ? 'bg-teal-500 text-white'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {day.charAt(0)}
              </button>
            ))}
          </div>
          <p className="text-xs text-teal-600 font-semibold text-center">
            {trainingDays.length} training {trainingDays.length === 1 ? 'day' : 'days'} selected
          </p>
        </div>

        {/* Long run day */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Preferred long run day</label>
            <p className="text-xs text-slate-400 mt-1">Usually a weekend — when you have the most time</p>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {LONG_RUN_DAYS.map(day => (
              <button
                key={day}
                onClick={() => setLongRunDay(day)}
                className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
                  longRunDay === day ? 'bg-teal-500 text-white border-teal-500' : 'bg-white text-slate-600 border-slate-200'
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
                  runTime === t.id ? 'bg-teal-50 border-teal-400' : 'bg-white border-slate-200'
                }`}
              >
                <span className="text-xl">{t.label.split(' ')[0]}</span>
                <div>
                  <p className={`text-sm font-bold ${runTime === t.id ? 'text-teal-800' : 'text-slate-700'}`}>
                    {t.label.split(' ').slice(1).join(' ')}
                  </p>
                  <p className="text-xs text-slate-400">{t.desc}</p>
                </div>
                {runTime === t.id && <span className="ml-auto text-teal-500 font-bold">✓</span>}
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
