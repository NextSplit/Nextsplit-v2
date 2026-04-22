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

  // Derive a slightly darker shade of kit for shorts
  const shorts = kit

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Large runner SVG — mid-stride pose */}
      <svg width="180" height="220" viewBox="0 0 60 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Shadow/ground */}
        <ellipse cx="30" cy="77" rx="14" ry="2.5" fill="rgba(0,0,0,0.25)" />

        {/* ── HAIR (behind head) ── */}
        {config.hairStyle === 'short' && (
          <ellipse cx="30" cy="8" rx="8" ry="5" fill={hair} />
        )}
        {config.hairStyle === 'ponytail' && (
          <>
            <ellipse cx="30" cy="8" rx="8" ry="5" fill={hair} />
            <path d="M38 10 Q44 14 41 20" stroke={hair} strokeWidth="3" strokeLinecap="round" fill="none"/>
          </>
        )}
        {config.hairStyle === 'bun' && (
          <>
            <ellipse cx="30" cy="8" rx="9" ry="6" fill={hair} />
            <circle cx="22" cy="9" r="3" fill={hair} />
            <circle cx="38" cy="9" r="3" fill={hair} />
            <circle cx="25" cy="4" r="2.5" fill={hair} />
            <circle cx="35" cy="4" r="2.5" fill={hair} />
          </>
        )}
        {config.hairStyle === 'long' && (
          <>
            <ellipse cx="30" cy="8" rx="8" ry="5" fill={hair} />
            <path d="M22 10 Q18 22 20 34" stroke={hair} strokeWidth="4" strokeLinecap="round" fill="none"/>
            <path d="M38 10 Q42 22 40 30" stroke={hair} strokeWidth="4" strokeLinecap="round" fill="none"/>
          </>
        )}

        {/* ── CAP ── */}

        {/* ── CROWN (Split Leader) ── */}
        {config.accessories?.includes('crown') && (
          <>
            <rect x="21" y="4" width="18" height="3.5" rx="1" fill="#c49a3c" />
            <polygon points="21,4 23,0 25,4" fill="#c49a3c" />
            <polygon points="25,4 27,1 29,4" fill="#c49a3c" />
            <polygon points="29,4 30,0 31,4" fill="#e8b84b" />
            <polygon points="31,4 33,1 35,4" fill="#c49a3c" />
            <polygon points="35,4 37,0 39,4" fill="#c49a3c" />
            <circle cx="30" cy="1.5" r="1" fill="#e85d26" opacity="0.9" />
            <rect x="22" y="4.5" width="16" height="1" rx="0.5" fill="white" opacity="0.2" />
          </>
        )}
        {config.accessories?.includes('cap') && (
          <>
            <ellipse cx="30" cy="6" rx="9" ry="4" fill={kit} />
            <path d="M21 7 Q20 5 16 6" stroke={kit} strokeWidth="3" strokeLinecap="round" fill="none"/>
          </>
        )}

        {/* ── HEAD ── */}
        <ellipse cx="30" cy="12" rx="8" ry="9" fill={skin} />

        {/* ── FACE ── */}
        {/* Eyes */}
        <circle cx="27" cy="11" r="1.2" fill="#1e293b" />
        <circle cx="33" cy="11" r="1.2" fill="#1e293b" />
        {/* Eye shine */}
        <circle cx="27.5" cy="10.5" r="0.4" fill="white" opacity="0.8" />
        <circle cx="33.5" cy="10.5" r="0.4" fill="white" opacity="0.8" />
        {/* Smile — determined expression */}
        <path d="M27 15 Q30 17 33 15" stroke="#c0836a" strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.7"/>
        {/* Nose */}
        <circle cx="30" cy="13.5" r="0.6" fill={skin} opacity="0.5" />

        {/* ── SUNGLASSES ── */}
        {config.accessories?.includes('sunglasses') && (
          <>
            <rect x="24.5" y="10" width="5" height="2.5" rx="1.2" fill="#1e293b" opacity="0.9"/>
            <rect x="30.5" y="10" width="5" height="2.5" rx="1.2" fill="#1e293b" opacity="0.9"/>
            <line x1="29.5" y1="11.2" x2="30.5" y2="11.2" stroke="#1e293b" strokeWidth="0.8" />
          </>
        )}

        {/* ── NECK ── */}
        <rect x="27.5" y="20" width="5" height="4" rx="1" fill={skin} />

        {/* ── TORSO — running vest ── */}
        <path d="M20 24 Q22 22 30 22 Q38 22 40 24 L41 42 Q38 44 30 44 Q22 44 19 42 Z" fill={kit} />
        {/* Kit stripe detail */}
        <path d="M22 26 L22 40" stroke="white" strokeWidth="0.8" opacity="0.2" strokeLinecap="round"/>
        <path d="M38 26 L38 40" stroke="white" strokeWidth="0.8" opacity="0.2" strokeLinecap="round"/>

        {/* ── ARMS — mid stride, one forward one back ── */}
        {/* Left arm (forward) */}
        <path d="M20 26 Q12 30 11 38" stroke={skin} strokeWidth="4" strokeLinecap="round" fill="none"/>
        {/* Left glove/hand */}
        <circle cx="11" cy="39" r="2.5" fill={skin} />
        {/* Right arm (back) */}
        <path d="M40 26 Q47 32 48 28" stroke={skin} strokeWidth="4" strokeLinecap="round" fill="none"/>
        <circle cx="48" cy="27" r="2.5" fill={skin} />

        {/* ── SHORTS ── */}
        <path d="M22 42 Q25 48 28 55 L32 55 Q35 48 38 42 Z" fill={shorts} opacity="0.9"/>

        {/* ── LEGS — running stride ── */}
        {/* Left leg (back, pushing off) */}
        <path d="M28 55 Q24 62 20 68" stroke={skin} strokeWidth="4.5" strokeLinecap="round" fill="none"/>
        {/* Left shoe */}
        <path d="M18 67 Q15 70 13 71 Q17 73 22 71 Q22 68 20 68 Z" fill={shoe} />
        <path d="M13 71 Q13 73 15 73 Q19 73 22 72" stroke={shoe} strokeWidth="1" fill="none"/>

        {/* Right leg (forward, leading) */}
        <path d="M32 55 Q38 62 42 60" stroke={skin} strokeWidth="4.5" strokeLinecap="round" fill="none"/>
        {/* Right shoe (in air) */}
        <path d="M42 60 Q46 58 48 59 Q46 63 42 63 Q40 62 42 60 Z" fill={shoe} />

        {/* ── RUNNING NUMBER BIB ── */}
        <rect x="25" y="30" width="10" height="8" rx="1" fill="white" opacity="0.9"/>
        <text x="30" y="37" textAnchor="middle" fontSize="4" fontWeight="bold" fill={kit} fontFamily="monospace">42K</text>


        {/* ── WATCH ── */}
        {config.accessories?.includes('watch') && (
          <rect x="9" y="36" width="4" height="3" rx="1" fill="#1e293b" opacity="0.8" />
        )}
      </svg>

      {/* Title */}
      <div className="text-center px-4">
        <div className="text-xs font-bold italic" style={{ color: 'var(--color-text-tertiary)' }}>
          &ldquo;{config.startingTitle}&rdquo;
        </div>
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
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--color-bg)' }}>
      <OnboardingProgressBar step={step} character={config} showFinishLine />

      <div className="flex-1 overflow-y-auto pb-32">
        {/* Header */}
        <div className="px-6 pt-4 pb-2 text-center">
          <h1 className="text-xl font-black" style={{ color: 'var(--color-text-primary)' }}>Create your runner</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-tertiary)' }}>This is how you&apos;ll appear across NextSplit</p>
        </div>

        {/* Character preview — large and prominent */}
        <div className="flex justify-center py-4 px-6">
          <div className="rounded-3xl px-8 py-6 w-full max-w-xs relative overflow-hidden"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            {/* Subtle background glow behind character */}
            <div className="absolute inset-0 opacity-10" style={{
              background: `radial-gradient(circle at 50% 60%, ${config.kitColour}, transparent 70%)`
            }} />
            <CharacterPreview config={config} />
          </div>
        </div>

        {/* Randomise */}
        <div className="flex justify-center mb-4">
          <button
            onClick={handleRandomise}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
          >
            🎲 Surprise me
          </button>
        </div>

        {/* Customisation panels */}
        <div className="px-4 space-y-4">

          {/* Handle / runner name */}
          <div className="rounded-2xl p-4 space-y-3" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
            <Section label="Runner name & handle">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-semibold text-sm" style={{ color: "var(--color-text-tertiary)" }}>@</span>
                <input
                  value={handle}
                  onChange={e => validateHandle(e.target.value)}
                  maxLength={20}
                  placeholder="yourhandle"
                  className="w-full pl-7 pr-3 py-2.5 rounded-xl text-sm outline-none transition-colors" style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border-2)", color: "var(--color-text-primary)" }}
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
          <div className="rounded-2xl p-4 space-y-4" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
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
          <div className="rounded-2xl p-4 space-y-4" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
            <Section label="Hair style">
              <PillPicker options={HAIR_STYLES} value={config.hairStyle} onChange={v => patch({ hairStyle: v })} />
            </Section>
            <Section label="Hair colour">
              <ColourPicker colours={HAIR_COLOURS} value={config.hairColour} onChange={v => patch({ hairColour: v })} />
            </Section>
          </div>

          {/* Kit */}
          <div className="rounded-2xl p-4 space-y-4" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
            <Section label="Kit colour">
              <ColourPicker colours={KIT_COLOURS} value={config.kitColour} onChange={v => patch({ kitColour: v })} />
            </Section>
            <Section label="Shoe colour">
              <ColourPicker colours={['#1e293b','#374151','#dc2626','#2563eb','#ffffff','#f59e0b']} value={config.shoeColour} onChange={v => patch({ shoeColour: v })} />
            </Section>
          </div>

          {/* Accessories */}
          <div className="rounded-2xl p-4 space-y-3" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
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
          <div className="rounded-2xl p-4 space-y-3" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
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
