'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCoach } from '@/hooks/useCoach'
import {
  CalendarBlank, ClipboardText, Campfire, UserCircle, CrownSimple,
} from '@phosphor-icons/react'

const ATHLETE_TABS = [
  { href: '/today',     label: 'Today',     Icon: CalendarBlank  },
  { href: '/plan',      label: 'Plan',      Icon: ClipboardText  },
  { href: '/community', label: 'Community', Icon: Campfire       },
  { href: '/profile',   label: 'Character', Icon: UserCircle     },
]

const COACH_TABS = [
  { href: '/today',       label: 'Today',    Icon: CalendarBlank },
  { href: '/plan',        label: 'Plan',     Icon: ClipboardText },
  { href: '/community',   label: 'Community',Icon: Campfire      },
  { href: '/profile',     label: 'Character',Icon: UserCircle    },
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
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-label={tab.label}
              aria-current={active ? 'page' : undefined}
              className="flex-1 flex flex-col items-center justify-center gap-1 pt-2.5 pb-2 relative transition-all focus-visible:outline-none"
            >
              {/* Active indicator dot */}
              {active && (
                <span
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full"
                  style={{ background: 'var(--ns-ember)' }}
                />
              )}

              <Icon
                component={tab.Icon}
                active={active}
              />

              <span
                className="text-[10px] font-semibold"
                style={{ color: active ? 'var(--ns-ember)' : 'var(--color-text-tertiary)' }}
              >
                {tab.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

function Icon({ component: IconComponent, active }: { component: React.ElementType; active: boolean }) {
  return (
    <IconComponent
      size={22}
      weight={active ? 'fill' : 'regular'}
      color={active ? 'var(--ns-ember)' : 'var(--color-text-tertiary)'}
    />
  )
}
