'use client'

import { useOnboarding } from '../context/OnboardingContext'
import MedicalDisclaimer from '@/components/MedicalDisclaimer'

export function WelcomeScreen() {
  const { next } = useOnboarding()

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--color-bg)" }} style={{ background: 'var(--color-bg)' }}>
      {/* Atmospheric gradient overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(43,92,63,0.18) 0%, transparent 70%)',
      }} />

      <div className="relative flex-1 flex flex-col items-center justify-center px-6 text-center pt-20 pb-6">

        {/* NextSplit wordmark — large Cormorant display */}
        <div className="mb-8">
          <h1 className="font-display text-5xl tracking-tight mb-1" style={{ color: 'var(--ns-ember)', letterSpacing: '-0.03em', fontStyle: 'italic' }}>
            NextSplit
          </h1>
          <div className="w-12 h-0.5 mx-auto rounded-full" style={{ background: 'var(--ns-ember)', opacity: 0.4 }} />
        </div>

        {/* Hero statement — direct, confident */}
        <div className="mb-8 max-w-xs">
          <p className="font-display text-2xl leading-snug mb-3" style={{ color: 'var(--color-text-primary)', fontStyle: 'italic', letterSpacing: '-0.01em' }}>
            Training that actually fits your life.
          </p>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
            Plans built around your schedule, your goals, and how your body responds. Not a template — you.
          </p>
        </div>

        {/* Three pillars — horizontal, compact */}
        <div className="w-full max-w-xs mb-10">
          <div className="grid grid-cols-3 gap-2">
            {[
              { emoji: '🎯', label: 'Your goals' },
              { emoji: '🧠', label: 'AI-adapted' },
              { emoji: '👥', label: 'Community' },
            ].map(v => (
              <div key={v.label} className="rounded-2xl p-3 text-center"
                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <div className="text-2xl mb-1">{v.emoji}</div>
                <p className="text-[10px] font-bold" style={{ color: 'var(--color-text-secondary)' }}>{v.label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-[10px] mb-6" style={{ color: 'var(--color-text-tertiary)' }}>
          3 minutes to set up · Your data stays private
        </p>
      </div>

      {/* CTA — ember primary */}
      <div className="relative px-6 pb-12 pt-2 space-y-3">
        <button onClick={next}
          className="w-full text-white py-4 rounded-2xl text-base font-black tracking-tight transition-all active:scale-95 btn-ember-pulse"
          style={{ background: 'linear-gradient(135deg, var(--ns-ember) 0%, #e0334f 100%)', boxShadow: '0 4px 20px rgba(232,93,38,0.35)' }}>
          Get started →
        </button>
        <p className="text-center text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>
          By continuing you agree to our{' '}
          <a href="/terms" style={{ color: 'var(--color-text-secondary)' }}>Terms</a> &{' '}
          <a href="/privacy" style={{ color: 'var(--color-text-secondary)' }}>Privacy</a>
        </p>
        <div className="mt-1">
          <MedicalDisclaimer variant="compact" />
        </div>
      </div>
    </div>
  )
}
