'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCoach } from '@/hooks/useCoach'
import {
  House, CalendarBlank, Compass, Star, CrownSimple,
} from '@phosphor-icons/react'

const TAB_COLOURS: Record<string, string> = {
  '/home':    '#06b6d4',
  '/train':   '#ff4d6d',
  '/explore': '#84cc16',
  '/you':     '#f0a500',
  '/coach':   '#8b5cf6',
}

const ATHLETE_TABS = [
  { href: '/home',    label: 'Home',    Icon: House         },
  { href: '/train',   label: 'Train',   Icon: CalendarBlank },
  { href: '/explore', label: 'Explore', Icon: Compass       },
  { href: '/you',     label: 'You',     Icon: Star          },
]

const COACH_TABS = [
  { href: '/home',    label: 'Home',    Icon: House         },
  { href: '/train',   label: 'Train',   Icon: CalendarBlank },
  { href: '/coach',   label: 'Coach',   Icon: CrownSimple   },
  { href: '/you',     label: 'You',     Icon: Star          },
]

export default function BottomNav() {
  const pathname    = usePathname()
  const { isCoach } = useCoach()
  const tabs = isCoach ? COACH_TABS : ATHLETE_TABS

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t safe-area-pb"
      style={{
        background: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
        boxShadow: '0 -1px 0 var(--color-border)',
      }}
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="flex items-stretch max-w-lg mx-auto">
        {tabs.map(tab => {
          const active = pathname === tab.href || pathname.startsWith(tab.href + '/')
          const colour = TAB_COLOURS[tab.href] ?? '#06b6d4'
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-label={tab.label}
              aria-current={active ? 'page' : undefined}
              className="flex-1 flex flex-col items-center justify-center gap-1 pt-2.5 pb-2 relative transition-all focus-visible:outline-none"
            >
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full"
                  style={{ background: colour }} />
              )}
              <tab.Icon
                size={22}
                weight={active ? 'fill' : 'regular'}
                color={active ? colour : 'var(--color-text-tertiary)'}
              />
              <span className="text-[10px] font-semibold transition-colors"
                style={{ color: active ? colour : 'var(--color-text-tertiary)' }}>
                {tab.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
