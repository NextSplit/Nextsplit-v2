'use client'

import { useState, useEffect, useRef } from 'react'
import { useOnboarding } from '../context/OnboardingContext'
import { OnboardingProgressBar } from './OnboardingProgressBar'
import { createClient } from '@/lib/supabase/client'

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
    <button onClick={onToggle}
      className="px-3 py-2 rounded-xl text-xs font-semibold border transition-all"
      style={{
        background:   selected ? 'var(--ns-forest)' : 'var(--color-surface)',
        color:        selected ? 'white' : 'var(--color-text-secondary)',
        borderColor:  selected ? 'var(--ns-forest)' : 'var(--color-border)',
      }}>
      {label}
    </button>
  )
}

function RequiredMark() {
  return <span style={{ color: 'var(--ns-ember)' }} title="Required"> ✱</span>
}

function FieldError({ msg }: { msg: string }) {
  return (
    <p className="text-xs mt-1 font-bold" style={{ color: 'var(--ns-ember)' }}>
      ⚠ {msg}
    </p>
  )
}

export function AboutYouScreen() {
  const { step, data, update, next, back } = useOnboarding()

  const [displayName, setDisplayName] = useState(data.displayName)
  const [dob, setDob]                 = useState<string>('')  // YYYY-MM-DD
  const [sex, setSex]                 = useState(data.biologicalSex)
  const [heightCm, setHeightCm]       = useState<string>('')
  const [weightKg, setWeightKg]       = useState<string>('')
  const [injuries, setInjuries]       = useState<string[]>(
    data.injuryNotes ? data.injuryNotes.split(',').map(s => s.trim()).filter(Boolean) : []
  )
  const [healthFlags, setHealthFlags] = useState<string[]>(data.healthFlags ?? [])
  const [saving, setSaving]           = useState(false)
  const [errors, setErrors]           = useState<Record<string, string>>({})
  const nameRef = useRef<HTMLInputElement>(null)

  // Pre-populate display name from auth on first load
  useEffect(() => {
    if (displayName) return
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      // Try display_name from profiles first
      supabase.from('profiles').select('display_name, handle, height_cm, weight_kg, date_of_birth').eq('id', user.id).single()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .then(({ data: profile }: { data: any }) => {
          if (profile?.display_name) setDisplayName(profile.display_name)
          else if (profile?.handle) setDisplayName(profile.handle)
          else if (user.email) setDisplayName(user.email.split('@')[0])
          if (profile?.date_of_birth) setDob(profile.date_of_birth)
          if (profile?.height_cm) setHeightCm(String(profile.height_cm))
          if (profile?.weight_kg) setWeightKg(String(profile.weight_kg))
        })
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  // Calculate age from DoB
  const calcAge = (dobStr: string): number | null => {
    if (!dobStr) return null
    const today = new Date()
    const birth = new Date(dobStr)
    let age = today.getFullYear() - birth.getFullYear()
    const m = today.getMonth() - birth.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
    return age
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!displayName.trim() || displayName.trim().length < 2) {
      newErrors.name = 'Please enter your name (at least 2 characters)'
    }
    if (dob) {
      const age = calcAge(dob)
      if (age !== null && (age < 13 || age > 100)) {
        newErrors.dob = 'Please enter a valid date of birth'
      }
    }
    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) {
      // Scroll to first error
      if (newErrors.name) nameRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return false
    }
    return true
  }

  const handleContinue = async () => {
    if (!validate()) return
    setSaving(true)
    const age = calcAge(dob)
    const injuryNotes = injuries.join(', ')
    update({
      displayName: displayName.trim(),
      age,
      biologicalSex: sex,
      injuryNotes,
      healthFlags,
    })
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('profiles').update({
        display_name:    displayName.trim(),
        age:             age,
        date_of_birth:   dob || null,
        biological_sex:  sex,
        height_cm:       heightCm ? parseFloat(heightCm) : null,
        weight_kg:       weightKg ? parseFloat(weightKg) : null,
        injury_notes:    injuryNotes,
        health_flags:    healthFlags,
        onboarding_step: 5,
      }).eq('id', user.id)
    }
    setSaving(false)
    next()
  }

  const cardStyle = { background: 'var(--color-surface)', border: '1px solid var(--color-border)' }
  const inputStyle = { background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }
  const labelStyle = { color: 'var(--color-text-tertiary)' }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--color-bg)' }}>
      <OnboardingProgressBar step={step} character={data.characterConfig} showFinishLine />

      <div className="flex-1 overflow-y-auto pb-32 px-4 pt-6 space-y-4">
        <div className="mb-2">
          <h1 className="text-xl font-black" style={{ color: 'var(--color-text-primary)' }}>About you</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            Personalises your training load and recommendations.
          </p>
        </div>

        {/* Name */}
        <div className="rounded-2xl p-4 space-y-2" style={cardStyle}>
          <label className="text-xs font-bold uppercase tracking-wider" style={labelStyle}>
            Your name <RequiredMark />
          </label>
          <input ref={nameRef}
            value={displayName}
            onChange={e => { setDisplayName(e.target.value); setErrors(p => ({ ...p, name: '' })) }}
            placeholder="How should we address you?"
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
            style={{ ...inputStyle, borderColor: errors.name ? 'var(--ns-ember)' : 'var(--color-border)' }}
          />
          {errors.name && <FieldError msg={errors.name} />}
        </div>

        {/* DoB + Sex */}
        <div className="rounded-2xl p-4 space-y-4" style={cardStyle}>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider" style={labelStyle}>
              Date of birth
            </label>
            <input type="date" value={dob}
              onChange={e => { setDob(e.target.value); setErrors(p => ({ ...p, dob: '' })) }}
              max={new Date(Date.now() - 13 * 365.25 * 24 * 3600 * 1000).toISOString().slice(0, 10)}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ ...inputStyle, borderColor: errors.dob ? 'var(--ns-ember)' : 'var(--color-border)' }}
            />
            {dob && calcAge(dob) && (
              <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                Age: {calcAge(dob)}
              </p>
            )}
            {errors.dob && <FieldError msg={errors.dob} />}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider" style={labelStyle}>Biological sex</label>
            <div className="flex gap-2">
              {(['male', 'female', 'prefer_not_to_say'] as const).map(val => (
                <button key={val} onClick={() => setSex(val)}
                  className="flex-1 py-2 rounded-xl text-xs font-bold border transition-all"
                  style={{
                    background:  sex === val ? 'var(--ns-forest)' : 'var(--color-surface-2)',
                    color:       sex === val ? 'white' : 'var(--color-text-secondary)',
                    borderColor: sex === val ? 'var(--ns-forest)' : 'var(--color-border)',
                  }}>
                  {val === 'prefer_not_to_say' ? 'Prefer not to say' : val.charAt(0).toUpperCase() + val.slice(1)}
                </button>
              ))}
            </div>
            <p className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>
              Used for training load recommendations only. We use your name in all communications.
            </p>
          </div>
        </div>

        {/* Height + Weight */}
        <div className="rounded-2xl p-4 space-y-3" style={cardStyle}>
          <label className="text-xs font-bold uppercase tracking-wider" style={labelStyle}>
            Physical stats <span style={{ color: 'var(--color-text-tertiary)', fontWeight: 'normal' }}>(optional)</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] mb-1" style={labelStyle}>Height (cm)</p>
              <input type="number" value={heightCm}
                onChange={e => setHeightCm(e.target.value)}
                placeholder="e.g. 175" min={100} max={250}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none font-data"
                style={inputStyle}
              />
            </div>
            <div>
              <p className="text-[10px] mb-1" style={labelStyle}>Weight (kg)</p>
              <input type="number" value={weightKg}
                onChange={e => setWeightKg(e.target.value)}
                placeholder="e.g. 70" min={30} max={300} step={0.1}
                className="w-full px-3 py-2.5 rounded-xl text-sm outline-none font-data"
                style={inputStyle}
              />
            </div>
          </div>
          <p className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>
            Used to calculate training zones and calorie estimates. Never shown publicly.
          </p>
        </div>

        {/* Injuries */}
        <div className="rounded-2xl p-4 space-y-3" style={cardStyle}>
          <label className="text-xs font-bold uppercase tracking-wider" style={labelStyle}>
            Current injuries or niggles
          </label>
          <div className="flex flex-wrap gap-2">
            {INJURY_OPTIONS.map(opt => (
              <TogglePill key={opt} label={opt}
                selected={opt === 'None' ? injuries.length === 0 : injuries.includes(opt)}
                onToggle={() => toggleInjury(opt)} />
            ))}
          </div>
        </div>

        {/* Health */}
        <div className="rounded-2xl p-4 space-y-3" style={cardStyle}>
          <label className="text-xs font-bold uppercase tracking-wider" style={labelStyle}>
            Health conditions
          </label>
          <div className="flex flex-wrap gap-2">
            {HEALTH_OPTIONS.map(opt => (
              <TogglePill key={opt.id} label={opt.label}
                selected={healthFlags.includes(opt.id)}
                onToggle={() => toggleHealth(opt.id)} />
            ))}
          </div>
          <p className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>
            Helps us flag sessions that need medical clearance. Stored securely and never shared.
          </p>
        </div>
      </div>

      {/* Nav */}
      <div className="fixed bottom-0 left-0 right-0 px-4 py-4 flex gap-3 border-t"
        style={{ background: 'var(--color-bg)', borderColor: 'var(--color-border)' }}>
        <button onClick={back}
          className="px-5 py-3 rounded-2xl border text-sm font-semibold"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
          ←
        </button>
        <button onClick={handleContinue} disabled={saving}
          className="flex-1 py-3 rounded-2xl text-sm font-bold text-white disabled:opacity-50 active:scale-95 transition-all"
          style={{ background: 'var(--ns-ember)' }}>
          {saving ? 'Saving…' : 'Continue →'}
        </button>
      </div>
    </div>
  )
}
