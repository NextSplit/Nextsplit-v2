'use client'

import { useState } from 'react'
import {
  ACTIVITY_LABELS, GOAL_LABELS, calculateMacroTargets,
  type ActivityLevel, type NutritionGoal, type NutritionSex, type NutritionSettings,
} from '@/lib/nutrition'

// PR C1 — TDEE setup card. Single-form intake of weight + height + age +
// sex + activity + goal. Lives at /train Fuel tab when settings absent.
// Once submitted, calls onSave with computed NutritionSettings; parent
// persists via useNutritionSettings().

interface Props {
  initial?: NutritionSettings | null
  onSave:   (s: NutritionSettings) => void
  onCancel?: () => void
}

export function TDEESetupCard({ initial, onSave, onCancel }: Props) {
  const [weight, setWeight] = useState(initial?.weight_kg?.toString() ?? '')
  const [height, setHeight] = useState(initial?.height_cm?.toString() ?? '')
  const [age,    setAge]    = useState(initial?.age?.toString() ?? '')
  const [sex,    setSex]    = useState<NutritionSex>(initial?.sex ?? 'male')
  const [activity, setActivity] = useState<ActivityLevel>(initial?.activity_level ?? 'moderate')
  const [goal,   setGoal]   = useState<NutritionGoal>(initial?.goal ?? 'maintain')

  const w = parseFloat(weight), h = parseFloat(height), a = parseInt(age, 10)
  const valid = !!w && w >= 30 && w <= 250 && !!h && h >= 120 && h <= 230 && !!a && a >= 13 && a <= 99

  const preview = valid
    ? calculateMacroTargets({ weight_kg: w, height_cm: h, age: a, sex, activity_level: activity, goal })
    : null

  function submit() {
    if (!valid) return
    onSave({ weight_kg: w, height_cm: h, age: a, sex, activity_level: activity, goal })
  }

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, rgba(255,184,0,0.10), rgba(255,140,0,0.04))',
        border: '2px solid rgba(255,184,0,0.40)',
      }}>
      <div className="px-4 pt-4 pb-3 border-b" style={{ borderColor: 'rgba(255,184,0,0.25)' }}>
        <p className="text-[10px] font-black uppercase tracking-widest"
          style={{ color: '#ffb800' }}>Fuel setup</p>
        <p className="text-base font-black mt-0.5" style={{ color: 'var(--color-text-primary)' }}>
          Tell us about you →
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
          We compute your daily calorie + macro targets from these. Used to
          plan meals around your training. Stored on this device.
        </p>
      </div>

      <div className="px-4 py-4 space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <NumberField label="Weight (kg)" value={weight} onChange={setWeight} min={30} max={250} placeholder="70" />
          <NumberField label="Height (cm)" value={height} onChange={setHeight} min={120} max={230} placeholder="175" />
          <NumberField label="Age"         value={age}    onChange={setAge}    min={13}  max={99}  placeholder="32" />
        </div>

        <ChipGroup<NutritionSex> label="Sex" value={sex} onChange={setSex}
          options={[
            { value: 'male',   label: 'Male' },
            { value: 'female', label: 'Female' },
            { value: 'other',  label: 'Other' },
          ]} />

        <RadioStack<ActivityLevel> label="Activity level" value={activity} onChange={setActivity}
          options={(Object.entries(ACTIVITY_LABELS) as Array<[ActivityLevel, string]>).map(([v, l]) => ({ value: v, label: l }))} />

        <ChipGroup<NutritionGoal> label="Goal" value={goal} onChange={setGoal}
          options={(Object.entries(GOAL_LABELS) as Array<[NutritionGoal, string]>).map(([v, l]) => ({ value: v, label: l }))} />

        {preview && (
          <div className="rounded-xl p-3"
            style={{ background: 'rgba(255,184,0,0.08)', border: '1.5px solid rgba(255,184,0,0.35)' }}>
            <p className="text-[10px] font-black uppercase tracking-widest mb-1"
              style={{ color: '#ffb800' }}>Daily target preview</p>
            <p className="text-2xl font-black" style={{ color: 'var(--color-text-primary)', letterSpacing: '-0.02em' }}>
              {preview.calories}<span className="text-sm font-bold ml-1" style={{ color: 'var(--color-text-tertiary)' }}>kcal</span>
            </p>
            <div className="flex gap-3 mt-1.5 text-xs">
              <span style={{ color: '#ef4444' }}><strong>P</strong> {preview.protein_g}g</span>
              <span style={{ color: '#3b82f6' }}><strong>C</strong> {preview.carbs_g}g</span>
              <span style={{ color: '#eab308' }}><strong>F</strong> {preview.fat_g}g</span>
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-1">
          {onCancel && (
            <button onClick={onCancel}
              className="flex-1 py-3 rounded-xl text-sm font-bold active:scale-95"
              style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-secondary)' }}>
              Cancel
            </button>
          )}
          <button onClick={submit} disabled={!valid}
            className="flex-1 py-3 rounded-xl text-sm font-black disabled:opacity-40 active:scale-95"
            style={{ background: '#ffb800', color: '#0a0e1a', boxShadow: '0 4px 16px rgba(255,184,0,0.4)' }}>
            Save targets →
          </button>
        </div>
      </div>
    </div>
  )
}

function NumberField({ label, value, onChange, min, max, placeholder }: {
  label: string; value: string; onChange: (v: string) => void
  min: number; max: number; placeholder: string
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-black uppercase tracking-widest block mb-1"
        style={{ color: 'var(--color-text-tertiary)' }}>{label}</span>
      <input type="number" inputMode="numeric"
        value={value} onChange={e => onChange(e.target.value)}
        min={min} max={max} placeholder={placeholder}
        className="w-full px-3 py-2.5 rounded-xl text-base font-bold outline-none"
        style={{
          background: 'var(--color-surface-2)',
          border: '2px solid var(--color-border-2)',
          color: 'var(--color-text-primary)',
        }} />
    </label>
  )
}

function ChipGroup<T extends string>({ label, value, onChange, options }: {
  label: string; value: T; onChange: (v: T) => void
  options: Array<{ value: T; label: string }>
}) {
  return (
    <div>
      <span className="text-[10px] font-black uppercase tracking-widest block mb-1.5"
        style={{ color: 'var(--color-text-tertiary)' }}>{label}</span>
      <div className="flex gap-2 flex-wrap">
        {options.map(o => {
          const selected = value === o.value
          return (
            <button key={o.value} onClick={() => onChange(o.value)}
              className="px-3 py-1.5 rounded-full text-xs font-bold transition-all"
              style={{
                background: selected ? '#ffb800' : 'var(--color-surface-2)',
                color: selected ? '#0a0e1a' : 'var(--color-text-secondary)',
                border: selected ? '2px solid #ffb800' : '2px solid var(--color-border-2)',
              }}>
              {o.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function RadioStack<T extends string>({ label, value, onChange, options }: {
  label: string; value: T; onChange: (v: T) => void
  options: Array<{ value: T; label: string }>
}) {
  return (
    <div>
      <span className="text-[10px] font-black uppercase tracking-widest block mb-1.5"
        style={{ color: 'var(--color-text-tertiary)' }}>{label}</span>
      <div className="space-y-1.5">
        {options.map(o => {
          const selected = value === o.value
          return (
            <button key={o.value} onClick={() => onChange(o.value)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-left transition-all"
              style={{
                background: selected ? 'rgba(255,184,0,0.15)' : 'var(--color-surface-2)',
                border: selected ? '2px solid rgba(255,184,0,0.55)' : '2px solid var(--color-border-2)',
                color: selected ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
              }}>
              <div className="w-4 h-4 rounded-full flex-shrink-0"
                style={{
                  background: selected ? '#ffb800' : 'transparent',
                  border: '2px solid ' + (selected ? '#ffb800' : 'var(--color-border-2)'),
                }} />
              <span>{o.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
