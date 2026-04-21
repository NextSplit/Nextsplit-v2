'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCoach } from '@/hooks/useCoach'
import {
  CalendarBlank, ClipboardText, Users, Campfire, UserCircle, Compass,
} from '@phosphor-icons/react'

// ── Tab definitions ──────────────────────────────────────────────────────────

const ATHLETE_TABS = [
  { href: '/today',     label: 'Today',     Icon: CalendarBlank  },
  { href: '/plan',      label: 'Plan',      Icon: ClipboardText  },
  { href: '/explore',   label: 'Explore',   Icon: Compass        },
  { href: '/community', label: 'Community', Icon: Campfire       },
  { href: '/profile',   label: 'Character', Icon: UserCircle     },
]

const COACH_TABS = [
  { href: '/today',       label: 'Today',     Icon: CalendarBlank },
  { href: '/plan',        label: 'Plan',      Icon: ClipboardText },
  { href: '/coach/squad', label: 'Athletes',  Icon: Users         },
  { href: '/community',   label: 'Community', Icon: Campfire      },
  { href: '/profile',     label: 'Character', Icon: UserCircle    },
]

// ── Component ────────────────────────────────────────────────────────────────

export default function BottomNav() {
  const pathname    = usePathname()
  const { isCoach } = useCoach()

  const tabs = isCoach ? COACH_TABS : ATHLETE_TABS

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 backdrop-blur-sm border-t safe-area-pb"
      style={{ background: 'rgba(15, 26, 20, 0.95)', borderColor: 'var(--color-border)' }}
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
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 pt-2 pb-1.5 relative transition-colors focus-visible:outline-none ${
                active ? 'text-[var(--ns-forest)]' : 'text-[var(--color-text-tertiary)]'
              }`}
            >
              {/* Active indicator line */}
              {active && (
                <span
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full"
                  style={{ background: 'var(--ns-ember)' }}
                />
              )}
              <tab.Icon size={23} weight={active ? 'fill' : 'regular'} />
              <span className={`text-[9px] font-bold tracking-wide ${active ? 'text-[var(--ns-forest)]' : 'text-[var(--color-text-tertiary)]'}`}>
                {tab.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
