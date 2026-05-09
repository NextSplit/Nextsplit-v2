'use client'

import { useState } from 'react'
import { useCharacter } from '@/hooks/useCharacter'
import { BUILD_CLASS_META, BUILD_CLASSES, type BuildClass } from '@/lib/character'

// Character system V1 — picker + stat-bar surface for the You tab.
// When the user has no build_class yet, renders an inline picker prompting
// them to choose. Once chosen, becomes a stat card showing 3 stat bars +
// class badge + level + tagline.
//
// Picker is two-step: tap a class → sees full blurb + bestFor sessions →
// confirms. This guards against accidental selection (the pick is sticky;
// re-picking later is supported but resets nothing).

export function BuildClassCard() {
  const { character, loading, setBuildClass } = useCharacter()
  const [previewClass, setPreviewClass] = useState<BuildClass | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  if (loading) {
    return (
      <div
        className="rounded-2xl animate-pulse"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', height: 132 }}
      />
    )
  }

  // Picker state — no character row yet
  if (!character) {
    return (
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
      >
        <div className="px-4 pt-3 pb-2 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <p className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--color-text-tertiary)' }}>
            🎯 Choose your build
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-primary)' }}>
            Pick the class that fits how you train. It shapes how your character earns stats.
          </p>
        </div>

        <div className="p-3 space-y-2">
          {BUILD_CLASSES.map(id => {
            const meta = BUILD_CLASS_META[id]
            const isPreview = previewClass === id
            return (
              <button
                key={id}
                onClick={() => setPreviewClass(isPreview ? null : id)}
                className="w-full text-left rounded-xl px-3 py-3 transition-all active:scale-95"
                style={{
                  background: isPreview ? 'var(--ns-magenta-light)' : 'var(--color-surface-2)',
                  border: '1.5px solid',
                  borderColor: isPreview ? 'var(--ns-magenta)' : 'var(--color-border)',
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl" aria-hidden>{meta.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black" style={{ color: 'var(--color-text-primary)' }}>
                      {meta.name}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                      {meta.tagline}
                    </p>
                  </div>
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
                    style={{
                      background: 'var(--color-surface-3)',
                      color: 'var(--color-text-secondary)',
                    }}
                  >
                    {meta.primary}
                  </span>
                </div>

                {isPreview && (
                  <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--color-border)' }}>
                    <p className="text-xs leading-relaxed mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                      {meta.blurb}
                    </p>
                    <p className="text-[10px] uppercase tracking-wider mb-3" style={{ color: 'var(--color-text-tertiary)' }}>
                      Best for: <span style={{ color: 'var(--ns-magenta)' }}>{meta.bestFor}</span>
                    </p>
                    <button
                      onClick={async (e) => {
                        e.stopPropagation()
                        if (saving) return
                        setSaving(true)
                        setError(null)
                        try {
                          await setBuildClass(id)
                        } catch (err) {
                          setError(err instanceof Error ? err.message : 'Failed to save')
                        } finally {
                          setSaving(false)
                        }
                      }}
                      disabled={saving}
                      className="w-full py-3 rounded-xl text-sm font-black text-white disabled:opacity-50"
                      style={{ background: 'var(--ns-magenta)' }}
                    >
                      {saving ? 'Saving…' : `Pick ${meta.name} →`}
                    </button>
                    {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // Stat card state — character exists
  const meta = BUILD_CLASS_META[character.build_class]
  const total = character.speed_stat + character.endurance_stat + character.resilience_stat
  const denom = Math.max(total, 30) // floor for early-game bars to feel proportional

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
    >
      <div className="px-4 pt-3 pb-3 flex items-center justify-between border-b" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex items-center gap-3">
          <span className="text-2xl" aria-hidden>{meta.emoji}</span>
          <div>
            <p className="text-sm font-black" style={{ color: 'var(--color-text-primary)' }}>
              {meta.name}
            </p>
            <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
              {meta.tagline}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p
            className="text-[10px] font-bold uppercase tracking-wider"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            Level
          </p>
          <p className="text-2xl font-black" style={{ color: 'var(--ns-magenta)' }}>
            {character.level}
          </p>
        </div>
      </div>

      <div className="px-4 py-3 space-y-2.5">
        <StatBar label="Speed"      value={character.speed_stat}      denom={denom} colour="var(--ns-cyan)" />
        <StatBar label="Endurance"  value={character.endurance_stat}  denom={denom} colour="var(--ns-forest)" />
        <StatBar label="Resilience" value={character.resilience_stat} denom={denom} colour="var(--ns-amber)" />
      </div>

      <div className="px-4 pb-3">
        <p className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>
          Logging a session feeds your stats. Best for: <span style={{ color: 'var(--ns-magenta)' }}>{meta.bestFor}</span>.
        </p>
      </div>
    </div>
  )
}

function StatBar({ label, value, denom, colour }: { label: string; value: number; denom: number; colour: string }) {
  const pct = Math.min(100, Math.round((value / denom) * 100))
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>
          {label}
        </span>
        <span className="text-xs font-black" style={{ color: 'var(--color-text-primary)' }}>
          {value}
        </span>
      </div>
      <div
        className="h-2 rounded-full overflow-hidden"
        style={{ background: 'var(--color-surface-2)' }}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: colour }}
        />
      </div>
    </div>
  )
}
