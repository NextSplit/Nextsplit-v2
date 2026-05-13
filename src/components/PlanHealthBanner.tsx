'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { validateGeneratedPlan, type PlanValidationIssue } from '@/lib/planValidator'
import type { PlanWeek, UserPlan } from '@/types/database'

// PR H5 — promote planValidator from advisory (Sentry breadcrumb only) to
// user-facing warning. Renders when the active plan has structural issues
// (missing taper, oversized long runs). Dismissible per plan via
// localStorage so users don't see the same warning every session.
//
// The validator is pure-TS + already battle-tested (12 unit tests); we
// just surface its output to the user with a one-line summary + expand-
// to-detail + "Adapt with AI" CTA pointing to the existing /api/ai/adapt
// flow at /train (modal mounted from PlanCompletionCeremony helpers).

interface Props {
  plan: UserPlan | null
}

// Validator expects { weeks: PlanWeek[] }; UserPlan stores weeks as
// weeks_data jsonb. Cast through unknown to satisfy strict types.
function toValidatorShape(plan: UserPlan): { weeks: PlanWeek[] } {
  return { weeks: (plan.weeks_data as unknown as PlanWeek[]) ?? [] }
}

// Plan distance lookup — UserPlan exposes goal as a string but not the
// canonical distance code. Best-effort parse from goal text + total km.
function inferDistance(plan: UserPlan): string {
  const goal = (plan as unknown as { goal?: string }).goal?.toLowerCase() ?? ''
  if (goal.includes('marathon') && !goal.includes('half')) return 'marathon'
  if (goal.includes('half') || goal.includes('21k')) return 'half'
  if (goal.includes('10 mile') || goal.includes('10mi')) return '10mi'
  if (goal.includes('10k')) return '10k'
  if (goal.includes('5k')) return '5k'
  if (goal.includes('ultra') && goal.includes('100')) return 'ultra_100mi'
  if (goal.includes('ultra') && goal.includes('50'))  return 'ultra_50mi'
  return '5k'
}

const ISSUE_LABEL: Record<PlanValidationIssue['code'], string> = {
  missing_taper:      'Missing taper weeks',
  oversized_long_run: 'Long run looks too big',
}

const ISSUE_FIX: Record<PlanValidationIssue['code'], string> = {
  missing_taper:      'A taper protects your race-day performance. AI can rebuild the final 2-3 weeks to add it.',
  oversized_long_run: 'One run >30% of weekly km raises injury risk. AI can redistribute the volume.',
}

function dismissKey(planId: string) {
  return `nextsplit_plan_health_dismissed_${planId}`
}

export function PlanHealthBanner({ plan }: Props) {
  const [open, setOpen] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  const issues: PlanValidationIssue[] = useMemo(() => {
    if (!plan) return []
    try {
      return validateGeneratedPlan(toValidatorShape(plan), inferDistance(plan)).issues
    } catch {
      return []  // never crash a Train mount on validator misfire
    }
  }, [plan])

  // Hydrate dismissal state on mount (per-plan localStorage flag)
  useMemo(() => {
    if (typeof window === 'undefined' || !plan?.id) return
    try {
      if (window.localStorage.getItem(dismissKey(plan.id)) === '1') {
        setDismissed(true)
      }
    } catch { /* localStorage unavailable */ }
  }, [plan?.id])

  if (!plan || issues.length === 0 || dismissed) return null

  const handleDismiss = () => {
    setDismissed(true)
    try { window.localStorage.setItem(dismissKey(plan.id), '1') } catch { /* noop */ }
  }

  return (
    <div className="rounded-2xl overflow-hidden mx-4"
      style={{
        background: 'linear-gradient(135deg, rgba(255,184,0,0.10), rgba(255,140,0,0.04))',
        border: '2px solid rgba(255,184,0,0.40)',
      }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full px-4 py-3 flex items-start gap-3 text-left active:opacity-80 transition-opacity">
        <span className="text-xl flex-shrink-0">⚠️</span>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#ffb800' }}>
            Plan health · {issues.length} issue{issues.length !== 1 ? 's' : ''}
          </p>
          <p className="text-sm font-black mt-0.5"
            style={{ color: 'var(--color-text-primary)', letterSpacing: '-0.01em' }}>
            {issues.map(i => ISSUE_LABEL[i.code]).join(' · ')}
          </p>
        </div>
        <span className="text-xs font-bold flex-shrink-0 mt-1"
          style={{ color: '#ffb800' }}>{open ? '▴' : '▾'}</span>
      </button>

      {open && (
        <div className="px-4 pb-3 space-y-3">
          <div className="space-y-2">
            {issues.map((iss, idx) => (
              <div key={idx} className="rounded-xl px-3 py-2"
                style={{ background: 'rgba(255,184,0,0.08)', border: '1px solid rgba(255,184,0,0.30)' }}>
                <p className="text-xs font-bold" style={{ color: '#ffb800' }}>
                  {ISSUE_LABEL[iss.code]}{iss.weekN ? ` · Week ${iss.weekN}` : ''}
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                  {iss.detail}
                </p>
                <p className="text-[11px] mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
                  Fix: {ISSUE_FIX[iss.code]}
                </p>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Link href="/train"
              className="flex-1 py-2.5 rounded-xl text-xs font-black text-center active:scale-95"
              style={{ background: '#ffb800', color: '#0a0e1a' }}>
              Adapt with AI →
            </Link>
            <button onClick={handleDismiss}
              className="px-3 py-2.5 rounded-xl text-xs font-bold active:scale-95"
              style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-secondary)' }}>
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
