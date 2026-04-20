'use client'

import { useState } from 'react'
import { useOnboarding } from '../context/OnboardingContext'
import { OnboardingProgressBar } from './OnboardingProgressBar'
import { createClient } from '@/lib/supabase/client'
import { db } from '@/lib/supabase/db'
import type { UserGoal } from '@/types/database'

const GOAL_TYPES = [
  { id: 'race',               emoji: '🎯', label: 'Specific race',        desc: 'Target event with a date and finish time' },
  { id: 'time_target',        emoji: '⏱',  label: 'Time target',          desc: 'Hit a benchmark — no race date needed' },
  { id: 'distance_milestone', emoji: '📏', label: 'Distance milestone',   desc: 'First half, first marathon, first ultra' },
  { id: 'general_fitness',    emoji: '💪', label: 'General fitness',      desc: 'Get fitter, build a habit, feel better' },
  { id: 'continuous',         emoji: '📈', label: 'Continuous improvement',desc: 'Serious runner — ongoing, no end date' },
] as const

const DISTANCES = ['5K', '10K', 'Half Marathon', 'Marathon', '50K', '100K', 'Ultra', 'Other']

function secsToHHMMSS(s: number) {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}:${m.toString().padStart(2,'0')}:${sec.toString().padStart(2,'0')}`
  return `${m}:${sec.toString().padStart(2,'0')}`
}

function parseTime(val: string): number | null {
  const parts = val.split(':').map(Number)
  if (parts.some(isNaN)) return null
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  return null
}

interface GoalCardProps {
  goal: Partial<UserGoal>
  index: number
  onUpdate: (g: Partial<UserGoal>) => void
  onRemove: () => void
  canRemove: boolean
}

function GoalCard({ goal, index, onUpdate, onRemove, canRemove }: GoalCardProps) {
  const [timeRaw, setTimeRaw] = useState(goal.target_time_secs ? secsToHHMMSS(goal.target_time_secs) : '')

  const handleTimeBlur = () => {
    const secs = parseTime(timeRaw)
    if (secs) onUpdate({ ...goal, target_time_secs: secs })
  }

  return (
    <div className={`bg-white rounded-2xl border shadow-sm p-4 space-y-4 ${
      goal.priority === 'A' ? 'border-teal-400' : 'border-slate-200'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-black px-2 py-1 rounded-full ${
            goal.priority === 'A' ? 'bg-teal-500 text-white' :
            goal.priority === 'B' ? 'bg-amber-400 text-white' :
            'bg-slate-300 text-slate-700'
          }`}>
            {goal.priority || 'B'} Race
          </span>
          {goal.priority === 'A' && <span className="text-xs text-teal-600 font-semibold">Primary goal</span>}
        </div>
        <div className="flex items-center gap-2">
          {/* Priority selector */}
          <div className="flex gap-1">
            {(['A','B','C'] as const).map(p => (
              <button
                key={p}
                onClick={() => onUpdate({ ...goal, priority: p })}
                className={`w-6 h-6 rounded-full text-xs font-bold transition-all ${
                  goal.priority === p ? 'bg-teal-500 text-white' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          {canRemove && (
            <button onClick={onRemove} className="text-slate-300 hover:text-red-400 transition-colors text-lg leading-none">×</button>
          )}
        </div>
      </div>

      {/* Goal type */}
      <div className="space-y-2">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Goal type</p>
        <div className="space-y-1.5">
          {GOAL_TYPES.map(t => (
            <button
              key={t.id}
              onClick={() => onUpdate({ ...goal, goal_type: t.id as UserGoal['goal_type'] })}
              className={`w-full text-left px-3 py-2 rounded-xl border text-xs transition-all ${
                goal.goal_type === t.id ? 'bg-teal-50 border-teal-400 text-teal-800' : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}
            >
              <span className="mr-2">{t.emoji}</span>
              <span className="font-semibold">{t.label}</span>
              <span className="text-slate-400 ml-1">— {t.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Race-specific fields */}
      {goal.goal_type === 'race' && (
        <div className="space-y-3 pt-1 border-t border-slate-100">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Race name</label>
            <input
              value={goal.race_name ?? ''}
              onChange={e => onUpdate({ ...goal, race_name: e.target.value })}
              placeholder="e.g. London Marathon 2025"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Race date</label>
              <input
                type="date"
                value={goal.race_date ?? ''}
                onChange={e => onUpdate({ ...goal, race_date: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:border-teal-400"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Distance</label>
              <select
                value={goal.race_distance_label ?? ''}
                onChange={e => onUpdate({ ...goal, race_distance_label: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:border-teal-400 bg-white"
              >
                <option value="">Select</option>
                {DISTANCES.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Target finish time</label>
            <input
              value={timeRaw}
              onChange={e => setTimeRaw(e.target.value)}
              onBlur={handleTimeBlur}
              placeholder="e.g. 3:45:00 or 25:30"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
            />
            {goal.target_time_secs && (
              <p className="text-xs text-teal-600">✓ Target: {secsToHHMMSS(goal.target_time_secs)}</p>
            )}
          </div>
        </div>
      )}

      {/* Time target fields */}
      {goal.goal_type === 'time_target' && (
        <div className="space-y-3 pt-1 border-t border-slate-100">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Distance</label>
              <select
                value={goal.race_distance_label ?? ''}
                onChange={e => onUpdate({ ...goal, race_distance_label: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:border-teal-400 bg-white"
              >
                <option value="">Select</option>
                {DISTANCES.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Target time</label>
              <input
                value={timeRaw}
                onChange={e => setTimeRaw(e.target.value)}
                onBlur={handleTimeBlur}
                placeholder="e.g. 19:59"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:border-teal-400"
              />
            </div>
          </div>
        </div>
      )}

      {/* Distance milestone fields */}
      {goal.goal_type === 'distance_milestone' && (
        <div className="space-y-3 pt-1 border-t border-slate-100">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Milestone distance</label>
            <div className="grid grid-cols-2 gap-2">
              {DISTANCES.map(d => (
                <button
                  key={d}
                  onClick={() => onUpdate({ ...goal, race_distance_label: d })}
                  className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
                    goal.race_distance_label === d ? 'bg-teal-500 text-white border-teal-500' : 'bg-white text-slate-600 border-slate-200'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Notes */}
      {(goal.goal_type === 'general_fitness' || goal.goal_type === 'continuous') && (
        <div className="space-y-1.5 pt-1 border-t border-slate-100">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">What does success look like?</label>
          <textarea
            value={goal.notes ?? ''}
            onChange={e => onUpdate({ ...goal, notes: e.target.value })}
            placeholder="e.g. Run 3x per week consistently, lose 5kg, feel energised..."
            rows={2}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:border-teal-400 resize-none"
          />
        </div>
      )}
    </div>
  )
}

export function GoalsScreen() {
  const { step, data, update, next, back } = useOnboarding()

  const defaultGoal: Partial<UserGoal> = { goal_type: 'race', priority: 'A' }
  const [goals, setGoals] = useState<Partial<UserGoal>[]>(
    data.goals.length > 0 ? data.goals : [defaultGoal]
  )
  const [saving, setSaving] = useState(false)

  const updateGoal = (i: number, g: Partial<UserGoal>) => {
    // Enforce only one A-priority goal
    if (g.priority === 'A') {
      setGoals(prev => prev.map((goal, idx) =>
        idx === i ? g : { ...goal, priority: goal.priority === 'A' ? 'B' : goal.priority }
      ))
    } else {
      setGoals(prev => prev.map((goal, idx) => idx === i ? g : goal))
    }
  }

  const addGoal = () => {
    const hasA = goals.some(g => g.priority === 'A')
    setGoals(prev => [...prev, { goal_type: 'race', priority: hasA ? 'B' : 'A' }])
  }

  const removeGoal = (i: number) => setGoals(prev => prev.filter((_, idx) => idx !== i))

  const canContinue = goals.length > 0 && goals.every(g => g.goal_type)

  const handleContinue = async () => {
    if (!canContinue) return
    setSaving(true)
    update({ goals })
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      // Upsert each goal
      for (const goal of goals) {
        if (goal.id) {
          await db(supabase).from('user_goals').update({ ...goal, updated_at: new Date().toISOString() }).eq('id', goal.id)
        } else {
          await db(supabase).from('user_goals').insert({ ...goal, user_id: user.id })
        }
      }
      await db(supabase).from('profiles').update({ onboarding_step: 6 }).eq('id', user.id)
    }
    setSaving(false)
    next()
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <OnboardingProgressBar step={step} character={data.characterConfig} showFinishLine />

      <div className="flex-1 overflow-y-auto pb-32 px-4 pt-6 space-y-4">
        <div className="mb-2">
          <h1 className="text-xl font-black text-slate-900">Your goals</h1>
          <p className="text-sm text-slate-500 mt-1">Set your A race as your primary target. Add B and C goals too — your plan adapts around all of them.</p>
        </div>

        {goals.map((goal, i) => (
          <GoalCard
            key={i}
            goal={goal}
            index={i}
            onUpdate={g => updateGoal(i, g)}
            onRemove={() => removeGoal(i)}
            canRemove={goals.length > 1}
          />
        ))}

        {goals.length < 5 && (
          <button
            onClick={addGoal}
            className="w-full py-3 rounded-2xl border-2 border-dashed border-slate-300 text-sm font-semibold text-slate-400 hover:border-teal-300 hover:text-teal-500 transition-all"
          >
            + Add another goal
          </button>
        )}

        <p className="text-xs text-slate-400 text-center pb-2">
          You can edit, add and remove goals anytime from your profile
        </p>
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
