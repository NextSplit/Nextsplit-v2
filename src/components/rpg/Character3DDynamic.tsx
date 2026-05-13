'use client'

import dynamic from 'next/dynamic'
import { renderCharSVG } from '@/lib/rpg'
import type { CharState } from './Character3D'

// PR J9b — CSS-variable resolver. Some RPG_CHARS use `var(--ns-cyan)` as
// their default accent; three.js can't parse CSS variables, so we resolve
// the few in-use vars to their hex values from globals.css. Anything that
// already looks like a hex (or rgb()) passes through unchanged.
const CSS_VAR_HEX: Record<string, string> = {
  '--ns-cyan':    '#00d4ff',
  '--ns-ember':   '#ff5e3a',
  '--ns-track':   '#22c55e',
  '--ns-magenta': '#ec4899',
  '--ns-amber':   '#f59e0b',
}
function resolveColour(input: string, fallback = '#00d4ff'): string {
  const m = input.match(/var\((--[a-z0-9-]+)\)/i)
  if (m) return CSS_VAR_HEX[m[1]] ?? fallback
  return input
}

// PR J9b — Shared dynamic import of Character3DCanvas with a graceful SVG
// fallback. Use this anywhere we previously did
//   <div dangerouslySetInnerHTML={{ __html: renderCharSVG(...) }} />
//
// While the ~600 KB three.js + R3F bundle is loading, the SVG renders in
// the same slot at the same size, so layout doesn't jump and slow networks
// still see a character (just the 2D one until JS arrives).
//
// `ssr: false` is critical — R3F needs `window` / WebGL.

const Character3DCanvas = dynamic(
  () => import('./Character3DCanvas'),
  {
    ssr:     false,
    loading: function SvgFallback() { return null }, // overridden per-instance below
  },
)

interface Props {
  charId:        string
  level:         number
  kitHex:        string
  state:         CharState
  size:          number
  /** Runner class colour for J9c shader rim. Falls back to kit hex. */
  classHex?:     string | null
  /** Level tier 0-3 from RPG_LEVELS[].tier — drives aura + trim cosmetics. */
  tier?:         0 | 1 | 2 | 3
  /** Render the SVG character only (no R3F). Use for performance-critical
   *  small previews (CharSelectModal grid) or SSR-server slots. */
  forceSvg?:     boolean
}

export default function Character3DDynamic({
  charId, level, kitHex, state, size, classHex, tier, forceSvg,
}: Props) {
  const resolvedKit   = resolveColour(kitHex)
  const resolvedClass = classHex ? resolveColour(classHex) : null

  if (forceSvg) {
    return (
      <div style={{ width: size, height: size * 1.25 }}
        dangerouslySetInnerHTML={{ __html: renderCharSVG(charId, level, size, Math.round(size * 1.25), kitHex) }} />
    )
  }

  return (
    <div style={{ width: size, height: size, position: 'relative' }}>
      {/* SVG sits underneath at the same position — visible while JS loads,
          then covered by the WebGL canvas once it mounts. */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        dangerouslySetInnerHTML={{
          __html: renderCharSVG(charId, level, Math.round(size * 0.85), Math.round(size * 1.05), kitHex),
        }}
      />
      <div className="absolute inset-0">
        <Character3DCanvas
          charId={charId}
          kitHex={resolvedKit}
          state={state}
          level={level}
          classHex={resolvedClass}
          tier={tier ?? 0}
          size={size}
        />
      </div>
    </div>
  )
}
