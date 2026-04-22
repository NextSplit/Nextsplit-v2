'use client'

import { useState } from 'react'
import { useOnboarding } from '../context/OnboardingContext'
import { OnboardingProgressBar } from './OnboardingProgressBar'
import { createClient } from '@/lib/supabase/client'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const
type Day = typeof DAYS[number]

const TIME_SLOTS = [
  { id: 'morning',   label: '🌅 Morning',   desc: 'Before 10am' },
  { id: 'lunch',     label: '☀️ Lunch',      desc: '11am–2pm' },
  { id: 'evening',   label: '🌆 Evening',    desc: 'After 5pm' },
  { id: 'flexible',  label: '🔀 Flexible',   desc: 'Any time' },
] as const

const LONG_RUN_DAYS = ['Saturday', 'Sunday', 'Monday', 'Friday'] as const

const COMMITMENT_OPTIONS = [
  { id: 'office',   label: '🏢 Office day' },
  { id: 'wfh',      label: '💻 Work from home' },
  { id: 'travel',   label: '✈️ Travel / away' },
  { id: 'family',   label: '👨‍👩‍👧 Family commitments' },
  { id: 'free',     label: '✓ Free day' },
]

export function YourLifeScreen() {
  const { step, data, update, next, back } = useOnboarding()

  // Which days to train
  const [trainingDays, setTrainingDays] = useState<Day[]>(
    (data.trainingDays > 0 ? DAYS.slice(0, data.trainingDays) : ['Tue', 'Thu', 'Sat', 'Sun']) as Day[]
  )
  // Best time per training day
  const [dayTimes, setDayTimes] = useState<Partial<Record<Day, string>>>({})
  // Long run day preference
  const [longRunDay, setLongRunDay] = useState(data.preferredLongRunDay ?? 'Sunday')
  // Work/life context per day
  const [dayContext, setDayContext] = useState<Partial<Record<Day, string>>>({})
  // Overall run time preference (fallback)
  const [runTime, setRunTime]     = useState(data.preferredRunTime ?? 'morning')
  // Expanded sections
  const [showDetails, setShowDetails] = useState(false)
  const [saving, setSaving]       = useState(false)

  const toggleDay = (day: Day) => {
    setTrainingDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    )
  }

  const setDayTime = (day: Day, time: string) => {
    setDayTimes(prev => ({ ...prev, [day]: time }))
  }

  const setContext = (day: Day, ctx: string) => {
    setDayContext(prev => ({ ...prev, [day]: ctx }))
  }

  const canContinue = trainingDays.length >= 1

  const handleContinue = async () => {
    if (!canContinue) return
    setSaving(true)

    // Build a rich schedule object
    const scheduleDetail = DAYS.reduce((acc, d) => {
      acc[d] = {
        training: trainingDays.includes(d),
        bestTime: dayTimes[d] ?? runTime,
        context: dayContext[d] ?? null,
      }
      return acc
    }, {} as Record<string, { training: boolean; bestTime: string; context: string | null }>)

    update({
      trainingDays: trainingDays.length,
      preferredLongRunDay: longRunDay,
      preferredRunTime: runTime as typeof data.preferredRunTime,
    })

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('profiles').update({
        training_days_per_week: trainingDays.length,
        preferred_training_days: trainingDays,
        preferred_long_run_day: longRunDay,
        preferred_run_time: runTime,
        schedule_detail: scheduleDetail,
        onboarding_step: 8,
      }).eq('id', user.id)
    }
    setSaving(false)
    next()
  }

  const cardStyle = { background: 'var(--color-surface)', border: '1px solid var(--color-border)' }
  const labelStyle = { color: 'var(--color-text-tertiary)' }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--color-bg)' }}>
      <OnboardingProgressBar step={step} character={data.characterConfig} showFinishLine />

      <div className="flex-1 overflow-y-auto pb-32 px-4 pt-6 space-y-4">
        <div className="mb-2">
          <h1 className="text-xl font-black" style={{ color: 'var(--color-text-primary)' }}>
            Your training week
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            Tell us how your week looks — we&apos;ll fit training around your life, not the other way around.
          </p>
        </div>

        {/* Training days */}
        <div className="rounded-2xl p-4 space-y-3" style={cardStyle}>
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider" style={labelStyle}>
              Which days can you train?
            </label>
            <span className="text-xs font-black" style={{ color: 'var(--ns-forest)' }}>
              {trainingDays.length}d / week
            </span>
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {DAYS.map(day => {
              const active = trainingDays.includes(day)
              return (
                <button key={day} onClick={() => toggleDay(day)}
                  className="aspect-square rounded-xl text-xs font-black transition-all active:scale-95"
                  style={{
                    background: active ? 'var(--ns-forest)' : 'var(--color-surface-2)',
                    color:      active ? 'white' : 'var(--color-text-tertiary)',
                    border:     `1px solid ${active ? 'var(--ns-forest)' : 'var(--color-border)'}`,
                  }}>
                  {day.slice(0, 1)}
                </button>
              )
            })}
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {[3, 4, 5, 6].map(n => (
              <button key={n}
                onClick={() => setTrainingDays(DAYS.slice(0, n) as unknown as Day[])}
                className="text-[10px] px-2.5 py-1 rounded-lg font-bold transition-all"
                style={{
                  background:  trainingDays.length === n ? 'var(--color-surface-2)' : 'transparent',
                  color:       'var(--color-text-tertiary)',
                  border:      '1px solid var(--color-border)',
                }}>
                {n}× week
              </button>
            ))}
          </div>
        </div>

        {/* Default training time */}
        <div className="rounded-2xl p-4 space-y-3" style={cardStyle}>
          <label className="text-xs font-bold uppercase tracking-wider" style={labelStyle}>
            When do you prefer to train?
          </label>
          <div className="grid grid-cols-2 gap-2">
            {TIME_SLOTS.map(t => (
              <button key={t.id} onClick={() => setRunTime(t.id as typeof runTime)}
                className="p-3 rounded-xl text-left transition-all"
                style={{
                  background:  runTime === t.id ? 'var(--color-surface-2)' : 'transparent',
                  border:      `1px solid ${runTime === t.id ? 'var(--ns-forest)' : 'var(--color-border)'}`,
                }}>
                <p className="text-xs font-bold" style={{ color: 'var(--color-text-primary)' }}>{t.label}</p>
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>{t.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Long run day */}
        <div className="rounded-2xl p-4 space-y-3" style={cardStyle}>
          <label className="text-xs font-bold uppercase tracking-wider" style={labelStyle}>
            Preferred long run day
          </label>
          <div className="flex flex-wrap gap-2">
            {LONG_RUN_DAYS.map(d => (
              <button key={d} onClick={() => setLongRunDay(d)}
                className="px-3 py-2 rounded-xl text-xs font-bold transition-all"
                style={{
                  background:  longRunDay === d ? 'var(--ns-forest)' : 'var(--color-surface-2)',
                  color:       longRunDay === d ? 'white' : 'var(--color-text-secondary)',
                  border:      `1px solid ${longRunDay === d ? 'var(--ns-forest)' : 'var(--color-border)'}`,
                }}>
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Optional: per-day detail */}
        <button
          onClick={() => setShowDetails(s => !s)}
          className="w-full py-3 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
          {showDetails ? '▲ Hide day detail' : '＋ Add day-by-day detail (optional)'}
          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: 'var(--color-surface-2)', color: 'var(--ns-forest)' }}>
            Improves plan accuracy
          </span>
        </button>

        {showDetails && (
          <div className="space-y-3">
            {DAYS.map(day => {
              const isTrain = trainingDays.includes(day)
              return (
                <div key={day} className="rounded-2xl p-4 space-y-3" style={{ ...cardStyle, opacity: isTrain ? 1 : 0.6 }}>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-black" style={{ color: 'var(--color-text-primary)' }}>{day}</p>
                    {isTrain && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(43,92,63,0.2)', color: 'var(--ns-forest)' }}>
                        Training day
                      </span>
                    )}
                  </div>

                  {/* Context */}
                  <div className="flex flex-wrap gap-1.5">
                    {COMMITMENT_OPTIONS.map(opt => (
                      <button key={opt.id}
                        onClick={() => setContext(day, opt.id)}
                        className="text-[10px] px-2 py-1 rounded-lg font-semibold transition-all"
                        style={{
                          background:  dayContext[day] === opt.id ? 'var(--color-surface-2)' : 'transparent',
                          color:       dayContext[day] === opt.id ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
                          border:      `1px solid ${dayContext[day] === opt.id ? 'var(--color-border)' : 'transparent'}`,
                        }}>
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  {/* Best time (only for training days) */}
                  {isTrain && (
                    <div>
                      <p className="text-[10px] mb-1.5 font-bold uppercase tracking-wider" style={labelStyle}>
                        Best time to train
                      </p>
                      <div className="flex gap-1.5">
                        {TIME_SLOTS.map(t => (
                          <button key={t.id}
                            onClick={() => setDayTime(day, t.id)}
                            className="flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all"
                            style={{
                              background:  (dayTimes[day] ?? runTime) === t.id ? 'var(--ns-forest)' : 'var(--color-surface-2)',
                              color:       (dayTimes[day] ?? runTime) === t.id ? 'white' : 'var(--color-text-tertiary)',
                            }}>
                            {t.label.split(' ')[0]}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Nav */}
      <div className="fixed bottom-0 left-0 right-0 px-4 py-4 flex gap-3 border-t"
        style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)' }}>
        <button onClick={back}
          className="px-5 py-3 rounded-2xl border text-sm font-semibold"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
          ←
        </button>
        <button onClick={handleContinue} disabled={!canContinue || saving}
          className="flex-1 py-3 rounded-2xl text-sm font-bold text-white disabled:opacity-50 active:scale-95 transition-all"
          style={{ background: 'var(--ns-ember)' }}>
          {saving ? 'Saving…' : 'Continue →'}
        </button>
      </div>
    </div>
  )
}
