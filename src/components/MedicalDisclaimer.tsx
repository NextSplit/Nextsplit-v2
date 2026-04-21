'use client'

/**
 * MedicalDisclaimer — Phase A2
 * Required in 3 locations (Ops Pillar legal requirement):
 * 1. Onboarding screen 1
 * 2. ACWR UI (where load is displayed)
 * 3. Wellness check-in
 *
 * "NextSplit is not a medical device. ACWR is a training load indicator,
 * not a medical diagnosis."
 */

interface Props {
  variant?: 'full' | 'compact'
}

export default function MedicalDisclaimer({ variant = 'compact' }: Props) {
  if (variant === 'compact') {
    return (
      <p className="text-[10px] text-gray-400 leading-relaxed text-center px-2">
        NextSplit is not a medical device. Training load indicators are for
        guidance only — not medical advice.{' '}
        <a href="/privacy" className="underline">Privacy policy</a>
      </p>
    )
  }

  return (
    <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
      <p className="text-[11px] font-bold text-amber-800 mb-1">Health data notice</p>
      <p className="text-[11px] text-amber-700 leading-relaxed">
        NextSplit is not a medical device. Training load metrics (ACWR, readiness,
        wellness) are indicators to support training decisions — not medical diagnoses.
        If you have a health condition affecting exercise, consult a medical professional
        before following any training plan.
      </p>
    </div>
  )
}
