'use client'

/**
 * AICoachingNote — surfaces AI reasoning in plain English, coach voice.
 * Product & UX Pillar spec: "Every AI action surfaces its rationale in plain English. No black boxes."
 *
 * Types:
 *   'acwr-risk'   — ACWR amber/red zone flag
 *   'adaptation'  — plan changed (auto or user-triggered)
 *   'readiness'   — low readiness score on a hard session day
 *   'on-demand'   — runner taps "get coaching insight"
 *   'weekly'      — weekly summary coaching note
 */

interface Props {
  type: 'acwr-risk' | 'adaptation' | 'readiness' | 'on-demand' | 'weekly'
  /** What changed / the flag / the insight */
  what: string
  /** Why — the reasoning */
  why: string
  /** What it protects / what's coming */
  protects?: string
  /** Whether runner has autonomy to override */
  canOverride?: boolean
  onOverride?: () => void
  onDismiss?: () => void
  className?: string
}

const TYPE_CONFIG = {
  'acwr-risk': {
    icon: '⚠️',
    label: 'Load alert',
    bg: 'bg-amber-50',
    border: 'border-amber-100',
    labelColor: 'text-amber-700',
    textColor: 'text-amber-800',
  },
  'adaptation': {
    icon: '🔄',
    label: 'Plan updated',
    bg: 'bg-[var(--ns-ember-light)]',
    border: 'border-[var(--ns-ember)]',
    labelColor: 'text-[var(--ns-ember)]',
    textColor: 'text-[var(--ns-ember)]',
  },
  'readiness': {
    icon: '🔋',
    label: 'Readiness low',
    bg: 'bg-amber-50',
    border: 'border-amber-100',
    labelColor: 'text-amber-700',
    textColor: 'text-amber-800',
  },
  'on-demand': {
    icon: '🧠',
    label: 'Coaching insight',
    bg: 'bg-[var(--ns-ember-light)]',
    border: 'border-[var(--ns-ember)]',
    labelColor: 'text-[var(--ns-ember)]',
    textColor: 'text-[var(--ns-ember)]',
  },
  'weekly': {
    icon: '📋',
    label: 'Weekly summary',
    bg: 'bg-[var(--ns-ember-light)]',
    border: 'border-[var(--ns-ember)]',
    labelColor: 'text-[var(--ns-ember)]',
    textColor: 'text-[var(--ns-ember)]',
  },
}

export default function AICoachingNote({
  type, what, why, protects, canOverride, onOverride, onDismiss, className = '',
}: Props) {
  const cfg = TYPE_CONFIG[type]

  return (
    <div className={`rounded-2xl border p-4 ${cfg.bg} ${cfg.border} ${className}`}>
      <div className="flex items-start gap-2.5">
        <span className="text-base mt-0.5 flex-shrink-0">{cfg.icon}</span>
        <div className="flex-1 min-w-0">
          {/* Label */}
          <p className={`text-[10px] font-bold uppercase tracking-wide mb-1 ${cfg.labelColor}`}>
            {cfg.label}
          </p>

          {/* What — the action/flag */}
          <p className={`text-sm font-semibold mb-1 leading-snug ${cfg.textColor}`}>
            {what}
          </p>

          {/* Why — the reasoning (spec: "surfaces what changed, why, what it protects") */}
          <p className={`text-xs leading-relaxed ${cfg.textColor} opacity-80`}>
            {why}
          </p>

          {/* What it protects */}
          {protects && (
            <p className={`text-xs leading-relaxed mt-1 font-medium ${cfg.textColor}`}>
              {protects}
            </p>
          )}

          {/* Override option — spec: "preserves runner autonomy" */}
          {canOverride && onOverride && (
            <button
              onClick={onOverride}
              className={`mt-2.5 text-xs font-bold underline ${cfg.labelColor}`}
            >
              Override — do the original session
            </button>
          )}
        </div>

        {/* Dismiss */}
        {onDismiss && (
          <button onClick={onDismiss} className="text-gray-300 text-lg leading-none flex-shrink-0 mt-0.5">
            ×
          </button>
        )}
      </div>
    </div>
  )
}
