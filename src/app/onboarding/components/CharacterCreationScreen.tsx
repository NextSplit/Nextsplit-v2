'use client'

import { useState, useCallback } from 'react'
import { useOnboarding } from '../context/OnboardingContext'
import { OnboardingProgressBar } from './OnboardingProgressBar'
import { STARTING_TITLES } from '@/types/database'
import type { CharacterConfig } from '@/types/database'
import { createClient } from '@/lib/supabase/client'
import { useRef } from 'react'

// ── Options ───────────────────────────────────────────────────────────────────

const BODY_TYPES   = [{ id: 'slim', label: 'Slim' }, { id: 'athletic', label: 'Athletic' }, { id: 'stocky', label: 'Stocky' }] as const
const HAIR_STYLES  = [{ id: 'short', label: 'Short' }, { id: 'medium', label: 'Medium' }, { id: 'long', label: 'Long' }, { id: 'ponytail', label: 'Ponytail' }, { id: 'bun', label: 'Bun' }, { id: 'none', label: 'None' }] as const
const FACE_SHAPES  = [{ id: 'oval', label: 'Oval' }, { id: 'round', label: 'Round' }, { id: 'square', label: 'Square' }, { id: 'heart', label: 'Heart' }] as const
const ACCESSORIES  = [{ id: 'cap', label: '🧢 Cap' }, { id: 'sunglasses', label: '🕶 Shades' }, { id: 'watch', label: '⌚ Watch' }] as const

const SKIN_TONES   = ['tone-1', 'tone-2', 'tone-3', 'tone-4', 'tone-5', 'tone-6'] as const
const SKIN_COLOURS: Record<string, string> = {
  'tone-1': '#FDDBB4', 'tone-2': '#F1C27D', 'tone-3': '#E0AC69',
  'tone-4': '#C68642', 'tone-5': '#8D5524', 'tone-6': '#4A2912',
}

const KIT_COLOURS  = ['var(--ns-forest)','#3b82f6','#ef4444','#f59e0b','#8b5cf6','#ec4899','#10b981','#f97316','#1e293b','#ffffff']
const HAIR_COLOURS = ['#3b2314','#1a0a00','#8b6914','#d4a017','#c0392b','#808080','#f5f5f5','#e8c4a0']

// ── Randomise helper ──────────────────────────────────────────────────────────
function randomCharacter(): CharacterConfig {
  const pick = <T,>(arr: readonly T[] | T[]): T => arr[Math.floor(Math.random() * arr.length)]
  return {
    bodyType:      pick(BODY_TYPES).id as CharacterConfig['bodyType'],
    skinTone:      pick(SKIN_TONES),
    hairStyle:     pick(HAIR_STYLES).id as CharacterConfig['hairStyle'],
    hairColour:    pick(HAIR_COLOURS),
    faceShape:     pick(FACE_SHAPES).id as CharacterConfig['faceShape'],
    kitColour:     pick(KIT_COLOURS),
    shoeColour:    pick(['#1e293b','#374151','#dc2626','#2563eb','#ffffff']),
    accessories:   Math.random() > 0.5 ? [pick(['cap','sunglasses','watch'] as const)] : [],
    startingTitle: pick(STARTING_TITLES),
  }
}

// ── Preview sprite (larger version for character builder) ─────────────────────
function CharacterPreview({ config }: { config: CharacterConfig }) {
  const skin = SKIN_COLOURS[config.skinTone] ?? SKIN_COLOURS['tone-3']
  const kit  = config.kitColour
  const hair = config.hairColour
  const shoe = config.shoeColour

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="100" height="130" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Head */}
        <ellipse cx="16" cy="6" rx="5" ry="5.5" fill={skin} />
        {config.hairStyle !== 'none' && <ellipse cx="16" cy="3" rx="5" ry="3" fill={hair} />}
        {/* Face shape hint */}
        <ellipse cx="16" cy="7" rx="2" ry="1.5" fill={skin} opacity="0.5" />
        {/* Eyes */}
        <circle cx="14" cy="6" r="0.7" fill="#1e293b" />
        <circle cx="18" cy="6" r="0.7" fill="#1e293b" />
        {/* Torso */}
        <rect x="11" y="11" width="10" height="10" rx="2" fill={kit} />
        {/* Arms */}
        <line x1="11" y1="13" x2="6" y2="19" stroke={skin} strokeWidth="2.5" strokeLinecap="round" />
        <line x1="21" y1="13" x2="26" y2="17" stroke={skin} strokeWidth="2.5" strokeLinecap="round" />
        {/* Shorts */}
        <rect x="11" y="20" width="5" height="5" rx="1" fill={kit} opacity="0.8" />
        <rect x="16" y="20" width="5" height="5" rx="1" fill={kit} opacity="0.8" />
        {/* Legs */}
        <line x1="13" y1="25" x2="8" y2="34" stroke={skin} strokeWidth="2.5" strokeLinecap="round" />
        <rect x="5" y="33" width="5" height="2.5" rx="1" fill={shoe} />
        <line x1="19" y1="25" x2="22" y2="33" stroke={skin} strokeWidth="2.5" strokeLinecap="round" />
        <rect x="20" y="32" width="5" height="2.5" rx="1" fill={shoe} />
        {/* Accessories */}
        {config.accessories?.includes('cap') && <rect x="11" y="1" width="10" height="3" rx="1" fill={kit} />}
        {config.accessories?.includes('sunglasses') && (
          <>
            <rect x="12.5" y="6.5" width="3" height="1.5" rx="0.5" fill="#1e293b" opacity="0.8" />
            <rect x="16.5" y="6.5" width="3" height="1.5" rx="0.5" fill="#1e293b" opacity="0.8" />
            <line x1="15.5" y1="7" x2="16.5" y2="7" stroke="#1e293b" strokeWidth="0.5" />
          </>
        )}
      </svg>
      <div className="text-center">
        <div className="text-xs font-semibold text-gray-600 italic">&ldquo;{config.startingTitle}&rdquo;</div>
      </div>
    </div>
  )
}

// ── Colour swatch ─────────────────────────────────────────────────────────────
function ColourPicker({ colours, value, onChange }: { colours: string[]; value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {colours.map(c => (
        <button
          key={c}
          onClick={() => onChange(c)}
          className={`w-7 h-7 rounded-full border-2 transition-all ${value === c ? 'border-[var(--ns-forest)] scale-110' : 'border-transparent'}`}
          style={{ background: c === '#ffffff' ? '#f8fafc' : c, boxShadow: c === '#ffffff' ? 'inset 0 0 0 1px #e2e8f0' : undefined }}
        />
      ))}
    </div>
  )
}

// ── Option pills ──────────────────────────────────────────────────────────────
function PillPicker<T extends string>({ options, value, onChange }: {
  options: readonly { id: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(o => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
            value === o.id
              ? 'bg-[var(--ns-forest)] text-white border-[var(--ns-forest)]'
              : 'bg-white text-gray-600 border-gray-200 hover:border-teal-300'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</p>
      {children}
    </div>
  )
}

// ── Main screen ───────────────────────────────────────────────────────────────
export function CharacterCreationScreen() {
  const { step, data, update, next } = useOnboarding()
  const [config, setConfig]         = useState<CharacterConfig>(data.characterConfig)
  const [handle, setHandle]         = useState(data.handle)
  const [handleError, setHandleError] = useState('')
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [checkingHandle, setCheckingHandle] = useState(false)
  const [saving, setSaving]         = useState(false)

  const patch = useCallback((partial: Partial<CharacterConfig>) => {
    setConfig(prev => ({ ...prev, ...partial }))
  }, [])

  const handleRandomise = () => setConfig(randomCharacter())

  const toggleAccessory = (id: 'cap' | 'sunglasses' | 'watch') => {
    const current = config.accessories ?? []
    const next    = current.includes(id) ? current.filter(a => a !== id) : [...current, id]
    patch({ accessories: next as CharacterConfig['accessories'] })
  }

  const validateHandle = async (value: string) => {
    const cleaned = value.toLowerCase().replace(/[^a-z0-9_]/g, '')
    setHandle(cleaned)
    setHandleError('')
    if (cleaned.length < 3) return
    setCheckingHandle(true)
    try {
      const supabase = createClient()
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .ilike('handle', cleaned)
        .maybeSingle()
      if (existing) setHandleError('This handle is taken — try another')
    } finally {
      setCheckingHandle(false)
    }
  }

  const canContinue = handle.length >= 3 && !handleError && !checkingHandle

  const handleContinue = async () => {
    if (!canContinue) return
    setSaving(true)
    update({ characterConfig: config, handle })
    setSaving(false)
    next()
  }

  return (
    <div className="min-h-screen bg-[#f8f8f6] flex flex-col">
      <OnboardingProgressBar step={step} character={config} showFinishLine />

      <div className="flex-1 overflow-y-auto pb-32">
        {/* Header */}
        <div className="px-6 pt-4 pb-2 text-center">
          <h1 className="text-xl font-black text-gray-900">Create your runner</h1>
          <p className="text-sm text-gray-500 mt-1">This is how you&apos;ll appear across NextSplit</p>
        </div>

        {/* Character preview */}
        <div className="flex justify-center py-4">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm px-10 py-6">
            <CharacterPreview config={config} />
          </div>
        </div>

        {/* Randomise */}
        <div className="flex justify-center mb-4">
          <button
            onClick={handleRandomise}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-600 hover:border-teal-300 transition-all"
          >
            🎲 Surprise me
          </button>
        </div>

        {/* Customisation panels */}
        <div className="px-4 space-y-5">

          {/* Handle / runner name */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
            <Section label="Runner name & handle">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-sm">@</span>
                <input
                  value={handle}
                  onChange={e => validateHandle(e.target.value)}
                  maxLength={20}
                  placeholder="yourhandle"
                  className="w-full pl-7 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-[var(--ns-forest)] focus:ring-2 focus:ring-[var(--ns-forest)]/20 transition-colors"
                />
              </div>
              {handle.length > 0 && handle.length < 3 && (
                <p className="text-xs text-amber-600">Minimum 3 characters</p>
              )}
              {handleError && <p className="text-xs text-red-500">{handleError}</p>}
              {checkingHandle && <p className="text-xs text-gray-400">Checking…</p>}
              {handle.length >= 3 && !handleError && !checkingHandle && (
                <p className="text-xs text-[var(--ns-forest)]">✓ @{handle} is available</p>
              )}
              <p className="text-xs text-gray-400">This is how other runners will find and follow you</p>
            </Section>
          </div>

          {/* Appearance */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-4">
            <Section label="Body type">
              <PillPicker options={BODY_TYPES} value={config.bodyType} onChange={v => patch({ bodyType: v })} />
            </Section>
            <Section label="Skin tone">
              <div className="flex gap-2">
                {SKIN_TONES.map(t => (
                  <button
                    key={t}
                    onClick={() => patch({ skinTone: t })}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${config.skinTone === t ? 'border-[var(--ns-forest)] scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: SKIN_COLOURS[t] }}
                  />
                ))}
              </div>
            </Section>
            <Section label="Face shape">
              <PillPicker options={FACE_SHAPES} value={config.faceShape} onChange={v => patch({ faceShape: v })} />
            </Section>
          </div>

          {/* Hair */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-4">
            <Section label="Hair style">
              <PillPicker options={HAIR_STYLES} value={config.hairStyle} onChange={v => patch({ hairStyle: v })} />
            </Section>
            <Section label="Hair colour">
              <ColourPicker colours={HAIR_COLOURS} value={config.hairColour} onChange={v => patch({ hairColour: v })} />
            </Section>
          </div>

          {/* Kit */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-4">
            <Section label="Kit colour">
              <ColourPicker colours={KIT_COLOURS} value={config.kitColour} onChange={v => patch({ kitColour: v })} />
            </Section>
            <Section label="Shoe colour">
              <ColourPicker colours={['#1e293b','#374151','#dc2626','#2563eb','#ffffff','#f59e0b']} value={config.shoeColour} onChange={v => patch({ shoeColour: v })} />
            </Section>
          </div>

          {/* Accessories */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
            <Section label="Accessories">
              <div className="flex gap-2 flex-wrap">
                {ACCESSORIES.map(a => (
                  <button
                    key={a.id}
                    onClick={() => toggleAccessory(a.id as 'cap' | 'sunglasses' | 'watch')}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                      config.accessories?.includes(a.id as 'cap' | 'sunglasses' | 'watch')
                        ? 'bg-[var(--ns-forest)] text-white border-[var(--ns-forest)]'
                        : 'bg-white text-gray-600 border-gray-200'
                    }`}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </Section>
          </div>

          {/* Starting title */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
            <Section label="Starting title">
              <div className="grid grid-cols-2 gap-2">
                {STARTING_TITLES.map(t => (
                  <button
                    key={t}
                    onClick={() => patch({ startingTitle: t })}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border text-left transition-all ${
                      config.startingTitle === t
                        ? 'bg-[var(--ns-forest)] text-white border-[var(--ns-forest)]'
                        : 'bg-white text-gray-600 border-gray-200'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </Section>
          </div>

        </div>
      </div>

      {/* Sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-4 safe-area-pb">
        <button
          onClick={handleContinue}
          disabled={!canContinue || saving}
          className="w-full bg-[var(--ns-forest)] text-white py-3.5 rounded-2xl text-sm font-bold disabled:opacity-40 transition-all hover:bg-[var(--ns-forest)] active:scale-95"
        >
          {saving ? 'Saving…' : canContinue ? `Let's go, @${handle} →` : 'Choose a handle to continue'}
        </button>
      </div>
    </div>
  )
}
