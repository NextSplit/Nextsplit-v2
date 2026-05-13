'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { RPG_CHARS } from '@/lib/rpg'
import type { CharState } from '@/components/rpg/Character3D'

// Lazy-load Canvas — keeps the three.js + R3F bundle (~600KB gz) off the
// initial dev/3d route. Server-render disabled (three.js needs DOM/WebGL).
const Character3DCanvas = dynamic(
  () => import('@/components/rpg/Character3DCanvas'),
  { ssr: false, loading: () => <div className="opacity-50">Loading 3D…</div> },
)

const STATES: CharState[] = ['idle', 'running', 'celebrating']

export default function Character3DPreviewClient() {
  const [charId, setCharId] = useState('m1')
  const [state, setState]   = useState<CharState>('idle')
  const [kitHex, setKitHex] = useState('#06B6D4')
  const [tier,   setTier]   = useState<0 | 1 | 2 | 3>(0)
  const [classHex, setClassHex] = useState<string | null>(null)

  return (
    <div className="px-4 pb-24 max-w-md mx-auto">
      {/* Preview canvas. Cyan glow background so the silhouette reads. */}
      <div className="rounded-2xl my-4 flex items-center justify-center"
        style={{
          background: 'radial-gradient(circle at 50% 60%, rgba(6,182,212,0.18) 0%, transparent 65%), var(--color-surface)',
          border: '1px solid var(--color-border)',
          aspectRatio: '1 / 1',
        }}>
        <Character3DCanvas
          charId={charId}
          kitHex={kitHex}
          state={state}
          tier={tier}
          classHex={classHex}
          size={320}
          interactive
        />
      </div>

      {/* Character selector */}
      <p className="text-xs font-black mb-1.5" style={{ color: 'var(--color-text-tertiary)' }}>CHARACTER</p>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {RPG_CHARS.map(c => (
          <button key={c.id} onClick={() => setCharId(c.id)}
            className="py-2 rounded-xl text-xs font-bold"
            style={{
              background: charId === c.id ? 'var(--ns-cyan)' : 'var(--color-surface-2)',
              color: charId === c.id ? '#0a0e1a' : 'var(--color-text-primary)',
              border: '1px solid var(--color-border)',
            }}>
            {c.label} ({c.body})
          </button>
        ))}
      </div>

      {/* Animation state selector */}
      <p className="text-xs font-black mb-1.5" style={{ color: 'var(--color-text-tertiary)' }}>ANIMATION</p>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {STATES.map(s => (
          <button key={s} onClick={() => setState(s)}
            className="py-2 rounded-xl text-xs font-bold capitalize"
            style={{
              background: state === s ? 'var(--ns-ember)' : 'var(--color-surface-2)',
              color: state === s ? '#fff' : 'var(--color-text-primary)',
              border: '1px solid var(--color-border)',
            }}>
            {s}
          </button>
        ))}
      </div>

      {/* Kit colour picker */}
      <p className="text-xs font-black mb-1.5" style={{ color: 'var(--color-text-tertiary)' }}>KIT COLOUR</p>
      <input type="color" value={kitHex} onChange={e => setKitHex(e.target.value)}
        className="w-full h-12 rounded-xl cursor-pointer"
        style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }} />

      {/* PR J9c — tier (drives aura + kit trim) */}
      <p className="mt-4 text-xs font-black mb-1.5" style={{ color: 'var(--color-text-tertiary)' }}>
        LEVEL TIER (aura + kit trim)
      </p>
      <div className="grid grid-cols-4 gap-2">
        {[0, 1, 2, 3].map(t => (
          <button key={t} onClick={() => setTier(t as 0|1|2|3)}
            className="py-2 rounded-xl text-xs font-bold"
            style={{
              background: tier === t ? 'var(--ns-track)' : 'var(--color-surface-2)',
              color: tier === t ? '#fff' : 'var(--color-text-primary)',
              border: '1px solid var(--color-border)',
            }}>
            T{t}{t === 2 ? ' silver' : t === 3 ? ' gold' : ''}
          </button>
        ))}
      </div>

      {/* PR J9c — runner-class colour (drives rim light + aura tint) */}
      <p className="mt-4 text-xs font-black mb-1.5" style={{ color: 'var(--color-text-tertiary)' }}>
        RUNNER CLASS COLOUR (rim light + aura tint)
      </p>
      <div className="flex gap-2 items-center">
        <button onClick={() => setClassHex(null)}
          className="flex-1 py-2 rounded-xl text-xs font-bold"
          style={{
            background: classHex === null ? 'var(--ns-magenta)' : 'var(--color-surface-2)',
            color: classHex === null ? '#fff' : 'var(--color-text-primary)',
            border: '1px solid var(--color-border)',
          }}>
          None
        </button>
        <input type="color" value={classHex ?? '#ec4899'} onChange={e => setClassHex(e.target.value)}
          className="flex-1 h-10 rounded-xl cursor-pointer"
          style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }} />
      </div>

      <p className="mt-6 text-xs leading-relaxed" style={{ color: 'var(--color-text-tertiary)' }}>
        Procedural placeholder — primitives only. When founder drops a rigged
        Mixamo glTF at <span className="font-mono">/public/3d/character-&#123;body&#125;.glb</span>,
        Character3D.tsx (see TODO) swaps to <span className="font-mono">useGLTF</span> +
        <span className="font-mono">useAnimations</span>. Cosmetics (aura,
        banner, kit trim) layer in via J9c.
      </p>
    </div>
  )
}
