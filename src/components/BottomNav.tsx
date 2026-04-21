'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCoach } from '@/hooks/useCoach'
import {
  CalendarBlank, ClipboardText, Users, Campfire, UserCircle,
} from '@phosphor-icons/react'

// ── Tab definitions ──────────────────────────────────────────────────────────

const ATHLETE_TABS = [
  { href: '/today',     label: 'Today',     Icon: CalendarBlank  },
  { href: '/plan',      label: 'Plan',      Icon: ClipboardText  },
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

  // Coaches get 5 tabs — Athletes is their core workspace
  // Athletes get 4 tabs — clean and focused
  const tabs = isCoach ? COACH_TABS : ATHLETE_TABS

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[#e8e8e8] safe-area-pb"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="flex items-center max-w-lg mx-auto">
        {tabs.map(tab => {
          const active = pathname === tab.href || pathname.startsWith(tab.href + '/')
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-label={tab.label}
              aria-current={active ? 'page' : undefined}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ns-forest)] focus-visible:ring-offset-1 rounded-lg ${
                active ? 'text-[var(--ns-forest)]' : 'text-[#aaa]'
              }`}
            >
              {<tab.Icon size={22} weight={active ? 'fill' : 'regular'} />}
              <span className={`text-[9px] font-semibold tracking-wide ${active ? 'text-[var(--ns-forest)]' : 'text-[#aaa]'}`}>
                {tab.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
