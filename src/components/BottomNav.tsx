'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCoach } from '@/hooks/useCoach'

// Tab definitions with SVG icons (no external dep needed)
const ATHLETE_TABS = [
  {
    href: '/home',
    label: 'Home',
    colour: '#00d4ff',
    icon: (active: boolean, colour: string) => (
      <svg width={24} height={24} viewBox="0 0 24 24" fill="none">
        <path d="M3 12L12 3L21 12V21H15V15H9V21H3V12Z"
          fill={active ? colour : 'none'}
          stroke={active ? colour : 'rgba(240,244,255,0.35)'}
          strokeWidth={active ? 0 : 2}
          strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: '/train',
    label: 'Train',
    colour: '#ff3d6e',
    icon: (active: boolean, colour: string) => (
      <svg width={24} height={24} viewBox="0 0 24 24" fill="none">
        <rect x={3} y={4} width={18} height={18} rx={3}
          fill={active ? colour : 'none'}
          stroke={active ? colour : 'rgba(240,244,255,0.35)'}
          strokeWidth={active ? 0 : 2} />
        <line x1={3} y1={9} x2={21} y2={9}
          stroke={active ? 'rgba(255,255,255,0.5)' : 'rgba(240,244,255,0.35)'}
          strokeWidth={1.5} />
        <line x1={8} y1={2} x2={8} y2={6}
          stroke={active ? 'rgba(255,255,255,0.8)' : 'rgba(240,244,255,0.35)'}
          strokeWidth={2} strokeLinecap="round" />
        <line x1={16} y1={2} x2={16} y2={6}
          stroke={active ? 'rgba(255,255,255,0.8)' : 'rgba(240,244,255,0.35)'}
          strokeWidth={2} strokeLinecap="round" />
        {active && <>
          <circle cx={8} cy={14} r={1.5} fill="white" opacity={0.9} />
          <circle cx={12} cy={14} r={1.5} fill="white" opacity={0.7} />
          <circle cx={16} cy={14} r={1.5} fill="white" opacity={0.5} />
        </>}
      </svg>
    ),
  },
  {
    href: '/squad',
    label: 'Squad',
    colour: '#7fff4d',
    icon: (active: boolean, colour: string) => (
      <svg width={24} height={24} viewBox="0 0 24 24" fill="none">
        <circle cx={12} cy={8} r={3.5}
          fill={active ? colour : 'none'}
          stroke={active ? colour : 'rgba(240,244,255,0.35)'}
          strokeWidth={active ? 0 : 2} />
        <circle cx={5} cy={10} r={2.5}
          fill={active ? `${colour}cc` : 'none'}
          stroke={active ? colour : 'rgba(240,244,255,0.25)'}
          strokeWidth={active ? 0 : 1.5} />
        <circle cx={19} cy={10} r={2.5}
          fill={active ? `${colour}cc` : 'none'}
          stroke={active ? colour : 'rgba(240,244,255,0.25)'}
          strokeWidth={active ? 0 : 1.5} />
        <path d="M6 21C6 18 8.7 16 12 16C15.3 16 18 18 18 21"
          stroke={active ? colour : 'rgba(240,244,255,0.35)'}
          strokeWidth={2} strokeLinecap="round" />
        <path d="M1 21C1 19.5 2.8 18.5 5 18.5"
          stroke={active ? colour : 'rgba(240,244,255,0.25)'}
          strokeWidth={1.5} strokeLinecap="round" opacity={active ? 1 : 0.6} />
        <path d="M23 21C23 19.5 21.2 18.5 19 18.5"
          stroke={active ? colour : 'rgba(240,244,255,0.25)'}
          strokeWidth={1.5} strokeLinecap="round" opacity={active ? 1 : 0.6} />
      </svg>
    ),
  },
  {
    href: '/you',
    label: 'You',
    colour: '#ffb800',
    icon: (active: boolean, colour: string) => (
      <svg width={24} height={24} viewBox="0 0 24 24" fill="none">
        <circle cx={12} cy={8} r={4}
          fill={active ? colour : 'none'}
          stroke={active ? colour : 'rgba(240,244,255,0.35)'}
          strokeWidth={active ? 0 : 2} />
        <path d="M4 21C4 17.134 7.582 14 12 14C16.418 14 20 17.134 20 21"
          stroke={active ? colour : 'rgba(240,244,255,0.35)'}
          strokeWidth={2} strokeLinecap="round" />
      </svg>
    ),
  },
]

const COACH_TABS = [
  ATHLETE_TABS[0],
  ATHLETE_TABS[1],
  {
    href: '/coach',
    label: 'Coach',
    colour: '#a855f7',
    icon: (active: boolean, colour: string) => (
      <svg width={24} height={24} viewBox="0 0 24 24" fill="none">
        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
          fill={active ? colour : 'none'}
          stroke={active ? colour : 'rgba(240,244,255,0.35)'}
          strokeWidth={active ? 0 : 2}
          strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  ATHLETE_TABS[3],
]

export default function BottomNav() {
  const pathname    = usePathname()
  const { isCoach } = useCoach()
  const tabs = isCoach ? COACH_TABS : ATHLETE_TABS

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        background: 'var(--color-surface)',
        borderTop: '2.5px solid var(--color-border-2)',
        boxShadow: '0 -4px 24px rgba(0,0,0,0.4)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="flex items-stretch max-w-lg mx-auto">
        {tabs.map(tab => {
          const active = pathname === tab.href || pathname.startsWith(tab.href + '/')
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-label={tab.label}
              aria-current={active ? 'page' : undefined}
              className="flex-1 flex flex-col items-center justify-center py-3 relative transition-all focus-visible:outline-none"
              style={{ minHeight: 60 }}
            >
              {/* Active indicator — thick top bar like Duolingo */}
              {active && (
                <span
                  className="absolute top-0 left-1/2 -translate-x-1/2 rounded-b-full"
                  style={{
                    width: 40,
                    height: 4,
                    background: tab.colour,
                    boxShadow: `0 0 12px ${tab.colour}80`,
                  }} />
              )}

              {/* Active bg glow */}
              {active && (
                <span className="absolute inset-x-2 inset-y-1 rounded-xl"
                  style={{ background: `${tab.colour}10` }} />
              )}

              {/* Icon */}
              <span className="relative transition-transform duration-200"
                style={{ transform: active ? 'scale(1.05)' : 'scale(1)' }}>
                {tab.icon(active, tab.colour)}
              </span>

              {/* Active dot indicator below icon (subtle) */}
              {active && (
                <span className="absolute bottom-1.5 w-1 h-1 rounded-full"
                  style={{ background: tab.colour }} />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
