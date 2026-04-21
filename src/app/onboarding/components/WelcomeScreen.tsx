'use client'

import { useOnboarding } from '../context/OnboardingContext'
import MedicalDisclaimer from '@/components/MedicalDisclaimer'

export function WelcomeScreen() {
  const { next } = useOnboarding()

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f172a] via-[#0d3d38] to-[#0f172a] flex flex-col">

      {/* Top section */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-6 pt-16">

        {/* Logo mark */}
        <div className="relative">
          <div className="w-20 h-20 rounded-3xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center">
            <span className="text-4xl">🏃</span>
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-teal-500 rounded-full flex items-center justify-center">
            <span className="text-xs">✓</span>
          </div>
        </div>

        {/* Headline */}
        <div className="space-y-2">
          <h1 className="text-3xl font-black text-white tracking-tight">
            Your coach is ready.
          </h1>
          <p className="text-teal-300 text-base">
            Let&apos;s build something great together.
          </p>
        </div>

        {/* Value props */}
        <div className="w-full max-w-xs space-y-3 text-left">
          {[
            { icon: '🧠', title: 'AI coaching', desc: 'Plans that adapt to your data, not generic templates' },
            { icon: '🏆', title: 'Real goals', desc: 'Race targets, PBs, or just building a habit — you decide' },
            { icon: '👥', title: 'Community', desc: 'Coaches, split leaders, clubs — find your people' },
          ].map(v => (
            <div key={v.title} className="flex items-start gap-3 bg-white/5 rounded-2xl p-3 border border-white/10">
              <span className="text-xl mt-0.5">{v.icon}</span>
              <div>
                <p className="text-white text-sm font-bold">{v.title}</p>
                <p className="text-slate-400 text-xs mt-0.5">{v.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Social proof */}
        <p className="text-slate-500 text-xs">
          Takes about 3 minutes · Your data stays private
        </p>
      </div>

      {/* CTA */}
      <div className="px-6 pb-12 pt-4">
        <button
          onClick={next}
          className="w-full text-white py-4 rounded-2xl text-base font-black tracking-tight transition-all active:scale-95"
          style={{ background: 'var(--ns-forest)' }}
        >
          Let&apos;s go →
        </button>
        <p className="text-center text-xs text-slate-600 mt-3">
          By continuing you agree to our{' '}
          <a href="/terms" className="text-slate-500 underline">Terms</a> &{' '}
          <a href="/privacy" className="text-slate-500 underline">Privacy Policy</a>
        </p>
        <div className="mt-3">
          <MedicalDisclaimer variant="compact" />
        </div>
      </div>
    </div>
  )
}
