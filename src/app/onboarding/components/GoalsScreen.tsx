'use client'

import { useState } from 'react'
import { useOnboarding } from '../context/OnboardingContext'
import { OnboardingProgressBar } from './OnboardingProgressBar'
import { createClient } from '@/lib/supabase/client'
import { db } from '@/lib/supabase/db'
import type { UserGoal } from '@/types/database'
import { SmartTimeInput, secsToDisplay } from '@/components/inputs/SmartInputs'

const GOAL_TYPES = [
  { id: 'race',               emoji: '🎯', label: 'Specific race',        desc: 'Target event with a date and finish time' },
  { id: 'time_target',        emoji: '⏱',  label: 'Time target',          desc: 'Hit a benchmark — no race date needed' },
  { id: 'distance_milestone', emoji: '📏', label: 'Distance milestone',   desc: 'First half, first marathon, first ultra' },
  { id: 'general_fitness',    emoji: '💪', label: 'General fitness',      desc: 'Get fitter, build a habit, feel better' },
  { id: 'continuous',         emoji: '📈', label: 'Continuous improvement',desc: 'Serious runner — ongoing, no end date' },
] as const

const DISTANCES = ['5K', '10K', 'Half Marathon', 'Marathon', '50K', '100K', 'Ultra', 'Other']

interface GoalCardProps {
  goal: Partial<UserGoal>
  index: number
  onUpdate: (g: Partial<UserGoal>) => void
  onRemove: () => void
  canRemove: boolean
  aIsTaken: boolean  // another goal already has A priority
}

function GoalCard({ goal, index, onUpdate, onRemove, canRemove, aIsTaken }: GoalCardProps) {
  return (
    <div className={` rounded-2xl border shadow-sm p-4 space-y-4 ${
      goal.priority === 'A' ? 'border-[var(--ns-ember)]' : 'border-[var(--color-border)]'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-black px-2 py-1 rounded-full ${
            goal.priority === 'A' ? 'bg-[var(--ns-ember)] text-white' :
            goal.priority === 'B' ? 'bg-amber-400 text-white' :
            'bg-slate-300 text-[var(--color-text-secondary)]'
          }`}>
            {goal.priority || 'B'} Race
          </span>
          {goal.priority === 'A' && <span className="text-xs text-[var(--ns-ember)] font-semibold">Primary goal</span>}
        </div>
        <div className="flex items-center gap-2">
          {/* Priority selector */}
          <div className="flex gap-1 items-center">
            {(['A','B','C'] as const).map(p => {
              const isLocked = p === 'A' && aIsTaken && goal.priority !== 'A'
              return (
                <button
                  key={p}
                  onClick={() => !isLocked && onUpdate({ ...goal, priority: p })}
                  disabled={isLocked}
                  title={isLocked ? 'Only one A race allowed' : undefined}
                  className={`w-6 h-6 rounded-full text-xs font-bold transition-all ${
                    goal.priority === p ? 'bg-[var(--ns-ember)] text-white' :
                    isLocked ? 'opacity-30 cursor-not-allowed' : ''
                  }`}
                  style={goal.priority !== p && !isLocked ? { background: 'var(--color-surface-2)', color: 'var(--color-text-tertiary)' } : {}}
                >
                  {p}
                </button>
              )
            })}
            {aIsTaken && goal.priority !== 'A' && (
              <span className="text-[9px] ml-1" style={{ color: 'var(--ns-ember)' }}>A taken</span>
            )}
          </div>
          {canRemove && (
            <button aria-label="Close" onClick={onRemove} className="text-gray-300 hover:text-red-400 transition-colors text-lg leading-none">×</button>
          )}
        </div>
      </div>

      {/* Goal type */}
      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>Goal type</p>
        <div className="space-y-1.5">
          {GOAL_TYPES.map(t => (
            <button
              key={t.id}
              onClick={() => onUpdate({ ...goal, goal_type: t.id as UserGoal['goal_type'] })}
              className={`w-full text-left px-3 py-2 rounded-xl border text-xs transition-all ${
                goal.goal_type === t.id ? 'bg-[var(--ns-ember-light)] border-[var(--ns-ember)] text-white' : 'border-[var(--color-border)] text-[var(--color-text-secondary)]'
              }`}
              style={goal.goal_type !== t.id ? { background: 'var(--color-surface-2)' } : {}}
            >
              <span className="mr-2">{t.emoji}</span>
              <span className="font-semibold">{t.label}</span>
              <span className="text-[var(--color-text-tertiary)] ml-1">— {t.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Race-specific fields */}
      {goal.goal_type === 'race' && (
        <div className="space-y-3 pt-1 border-t border-[var(--color-border)]">
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>Race name</label>
            <input
              value={goal.race_name ?? ''}
              onChange={e => onUpdate({ ...goal, race_name: e.target.value })}
              placeholder="e.g. London Marathon 2025"
              className="w-full px-3 py-2 rounded-xl border border-[var(--color-border)] text-sm outline-none focus:border-[var(--ns-ember)] focus:ring-2 focus:ring-[var(--ns-ember)]/20"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>Race date</label>
              <input
                type="date"
                value={goal.race_date ?? ''}
                onChange={e => onUpdate({ ...goal, race_date: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-[var(--color-border)] text-sm outline-none focus:border-[var(--ns-ember)]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>Distance</label>
              <select
                value={goal.race_distance_label ?? ''}
                onChange={e => onUpdate({ ...goal, race_distance_label: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-[var(--color-border)] text-sm outline-none focus:border-[var(--ns-ember)] "
              >
                <option value="">Select</option>
                {DISTANCES.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>
          <SmartTimeInput
            label="Target finish time"
            value={goal.target_time_secs ?? null}
            onChange={secs => onUpdate({ ...goal, target_time_secs: secs ?? undefined })}
            
          />
        </div>
      )}

      {/* Time target fields */}
      {goal.goal_type === 'time_target' && (
        <div className="space-y-3 pt-1 border-t border-[var(--color-border)]">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>Distance</label>
              <select
                value={goal.race_distance_label ?? ''}
                onChange={e => onUpdate({ ...goal, race_distance_label: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-[var(--color-border)] text-sm outline-none focus:border-[var(--ns-ember)] "
              >
                <option value="">Select</option>
                {DISTANCES.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <SmartTimeInput
              label="Target time"
              value={goal.target_time_secs ?? null}
              onChange={secs => onUpdate({ ...goal, target_time_secs: secs ?? undefined })}
              hint="e.g. 1930 → 0:19:30"
            />
          </div>
        </div>
      )}

      {/* Distance milestone fields */}
      {goal.goal_type === 'distance_milestone' && (
        <div className="space-y-3 pt-1 border-t" style={{ borderColor: 'var(--color-border)' }}>
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>Milestone distance</label>
            <div className="grid grid-cols-2 gap-2">
              {DISTANCES.map(d => (
                <button
                  key={d}
                  onClick={() => onUpdate({ ...goal, race_distance_label: d })}
                  className="py-2 rounded-xl text-xs font-semibold border transition-all"
                  style={{
                    background:  goal.race_distance_label === d ? 'var(--ns-ember)' : 'var(--color-surface-2)',
                    color:       goal.race_distance_label === d ? 'white' : 'var(--color-text-secondary)',
                    borderColor: goal.race_distance_label === d ? 'var(--ns-ember)' : 'var(--color-border)',
                  }}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>Milestone type</label>
            <div className="flex flex-wrap gap-2">
              {['Single run', 'Weekly', 'Monthly', 'Annual'].map(freq => (
                <button key={freq}
                  onClick={() => onUpdate({ ...goal, notes: `milestone_freq:${freq}` })}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all"
                  style={{
                    background:  goal.notes === `milestone_freq:${freq}` ? 'var(--ns-ember)' : 'var(--color-surface-2)',
                    color:       goal.notes === `milestone_freq:${freq}` ? 'white' : 'var(--color-text-secondary)',
                    borderColor: goal.notes === `milestone_freq:${freq}` ? 'var(--ns-ember)' : 'var(--color-border)',
                  }}>
                  {freq}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Notes */}
      {(goal.goal_type === 'general_fitness' || goal.goal_type === 'continuous') && (
        <div className="space-y-1.5 pt-1 border-t border-[var(--color-border)]">
          <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>What does success look like?</label>
          <textarea
            value={goal.notes ?? ''}
            onChange={e => onUpdate({ ...goal, notes: e.target.value })}
            placeholder="e.g. Run 3x per week consistently, lose 5kg, feel energised..."
            rows={2}
            className="w-full px-3 py-2 rounded-xl border border-[var(--color-border)] text-sm outline-none focus:border-[var(--ns-ember)] resize-none"
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
    <div className="min-h-screen flex flex-col" style={{ background: "var(--color-bg)" }} style={{ background: "var(--color-bg)" }}>
      <OnboardingProgressBar step={step} character={data.characterConfig} showFinishLine />

      <div className="flex-1 overflow-y-auto pb-32 px-4 pt-6 space-y-4">
        <div className="mb-2">
          <h1 className="text-xl font-black" style={{ color: 'var(--color-text-primary)' }}>Your goals</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>Set your A race as your primary target. Add B and C goals too — your plan adapts around all of them.</p>
        </div>

        {goals.map((goal, i) => (
          <GoalCard
            key={i}
            goal={goal}
            index={i}
            onUpdate={g => updateGoal(i, g)}
            onRemove={() => removeGoal(i)}
            canRemove={goals.length > 1}
            aIsTaken={goals.some((g, gi) => gi !== i && g.priority === 'A')}
          />
        ))}

        {goals.length < 5 && (
          <button
            onClick={addGoal}
            className="w-full py-3 rounded-2xl border-2 border-dashed border-slate-300 text-sm font-semibold text-[var(--color-text-tertiary)] hover:border-orange-300 hover:text-[var(--ns-ember)] transition-all"
          >
            + Add another goal
          </button>
        )}

        <p className="text-xs text-[var(--color-text-tertiary)] text-center pb-2">
          You can edit, add and remove goals anytime from your profile
        </p>
      </div>

      {/* Nav */}
      <div className="fixed bottom-0 left-0 right-0  border-t border-[var(--color-border)] px-4 py-4 space-y-2">
        <div className="flex gap-3">
          <button onClick={back} className="px-5 py-3 rounded-2xl border border-[var(--color-border)] text-sm font-semibold text-[var(--color-text-secondary)]">←</button>
          <button
            onClick={handleContinue}
            disabled={!canContinue || saving}
            className="flex-1 py-3 rounded-2xl text-sm font-bold text-white disabled:opacity-50 transition-all active:scale-95" style={{ background: 'var(--ns-ember)' }}
          >
            {saving ? 'Saving…' : 'Continue →'}
          </button>
        </div>
        <button
          onClick={() => {
            update({ goals: [{ goal_type: 'general_fitness', priority: 'A' }] })
            next()
          }}
          className="w-full text-[var(--color-text-tertiary)] text-xs py-1.5 hover:text-[var(--color-text-secondary)] transition-colors"
        >
          Skip — I'll set a goal later
        </button>
      </div>
    </div>
  )
}
