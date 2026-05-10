'use client'

import Link from 'next/link'
import { Analytics } from '@/lib/analytics'

// BL-C6 — trial countdown banner on Home.
//
// Shows during the 14-day Pro trial unlocked by squad-join or first coach
// message. Kept conversational + low-pressure to match the Splity voice
// rule (forward, never backward, no obligation language). The CTA routes
// to the upgrade flow so users can lock in founding pricing before the
// trial lapses without losing access.
//
// Visual tiers escalate as the window closes:
//   · 14–8 days left  → calm cyan, "you've got Pro on us"
//   · 7–4 days left   → amber, "X days left to lock in"
//   · 3–0 days left   → ember, "X days left — lock in £7.99/mo"

interface Props {
  show:           boolean
  trialDaysLeft:  number | null
  trialSource:    'squad_join' | 'first_coach_message' | null
}

function tierFor(days: number): { bg: string; border: string; accent: string; lead: string } {
  if (days <= 3) {
    return {
      bg:     'linear-gradient(135deg, rgba(255,61,110,0.18), rgba(255,61,110,0.08))',
      border: 'rgba(255,61,110,0.45)',
      accent: '#ff3d6e',
      lead:   `${days === 0 ? 'Trial ends today' : `${days} day${days === 1 ? '' : 's'} left`} — lock in founding £7.99/mo`,
    }
  }
  if (days <= 7) {
    return {
      bg:     'linear-gradient(135deg, rgba(255,184,0,0.16), rgba(255,184,0,0.06))',
      border: 'rgba(255,184,0,0.45)',
      accent: '#ffb800',
      lead:   `${days} days left — lock in founding price`,
    }
  }
  return {
    bg:     'linear-gradient(135deg, rgba(0,212,255,0.14), rgba(0,212,255,0.06))',
    border: 'rgba(0,212,255,0.4)',
    accent: '#00d4ff',
    lead:   `Pro on us — ${days} days remaining`,
  }
}

const SOURCE_LABEL: Record<string, string> = {
  squad_join:           'Welcome from the squad',
  first_coach_message:  'Your coach unlocked this',
}

export function TrialBanner({ show, trialDaysLeft, trialSource }: Props) {
  if (!show || trialDaysLeft === null) return null

  const tier   = tierFor(trialDaysLeft)
  const label  = trialSource ? SOURCE_LABEL[trialSource] ?? 'Trial active' : 'Trial active'

  return (
    <Link
      href="/upgrade"
      onClick={() => {
        Analytics.upgradePromptShown('trial_banner', `home_trial_${trialDaysLeft}d`)
      }}
      className="block mx-4 rounded-2xl px-4 py-3.5 active:scale-[0.98] transition-all"
      style={{
        background: tier.bg,
        border:     `2px solid ${tier.border}`,
        boxShadow:  `0 8px 24px ${tier.accent}22`,
      }}
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl flex-shrink-0" aria-hidden>⭐</span>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: tier.accent }}>
            {label}
          </p>
          <p className="text-sm font-black mt-0.5" style={{ color: 'var(--color-text-primary)' }}>
            {tier.lead}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
            Adaptive plans · ACWR · AI coaching · all of it.
          </p>
        </div>
        <span className="text-xl flex-shrink-0" style={{ color: tier.accent }} aria-hidden>→</span>
      </div>
    </Link>
  )
}
