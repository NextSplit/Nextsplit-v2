'use client'

import { useActiveCosmetics } from '@/hooks/useActiveCosmetics'

// Renders banner / shoes / accessory cosmetic overlays around the
// HeroCard avatar. Composable wrapper — accepts children (the existing
// avatar SVG) and layers cosmetic effects above/below it.
//
// Effects:
//   · banner.asset.effect = 'flame_trail' → animated flame plume behind
//     the avatar (CSS-only; no SVG asset commission needed yet)
//   · shoes (any) → small chip badge below the avatar with shoes name
//   · accessory (any) → small icon overlay top-right of avatar
//
// Designed to live inside HeroCard's avatar wrapper. Tap-through events
// pass to children unchanged.

interface Props {
  children: React.ReactNode
}

export function CharacterAccessoryOverlay({ children }: Props) {
  const { active } = useActiveCosmetics()
  const banner    = active.get('banner')
  const shoes     = active.get('shoes')
  const accessory = active.get('accessory')

  const bannerEffect = banner?.asset && (banner.asset as { effect?: string }).effect
  const showFlame    = bannerEffect === 'flame_trail'

  return (
    <div className="relative inline-block">
      {/* Flame trail behind the avatar */}
      {showFlame && (
        <div
          className="absolute pointer-events-none"
          style={{
            left: -16, right: -16, bottom: -8, height: 24,
            background: 'radial-gradient(ellipse at center bottom, #ff7438 0%, #ffb800 35%, transparent 75%)',
            filter: 'blur(2px)',
            animation: 'ns-flame-flicker 1.2s ease-in-out infinite alternate',
            opacity: 0.85,
            zIndex: 0,
          }}
          aria-hidden
        />
      )}

      {/* Avatar (children) */}
      <div className="relative" style={{ zIndex: 1 }}>{children}</div>

      {/* Accessory icon overlay */}
      {accessory && (
        <div
          className="absolute -top-1 -left-1 text-base leading-none"
          style={{ zIndex: 2 }}
          title={accessory.name}
          aria-label={accessory.name}
        >
          {accessory.emoji}
        </div>
      )}

      {/* Shoes chip below */}
      {shoes && (
        <div
          className="absolute left-1/2 -translate-x-1/2 text-[9px] font-black px-1.5 py-0.5 rounded-full whitespace-nowrap"
          style={{
            bottom: -22,
            background: 'var(--color-surface-2)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-secondary)',
            zIndex: 2,
          }}
          title={shoes.name}
        >
          {shoes.emoji} {shoes.name.split(' ')[0]}
        </div>
      )}
    </div>
  )
}
