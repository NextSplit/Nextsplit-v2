'use client'

import { useEffect, useState } from 'react'
import { getRunnerClass, RUNNER_CLASSES, CLASS_COACHING_INSIGHTS } from '@/lib/rpg'
import type { RunnerClassId } from '@/lib/rpg'
import { hapticSuccess } from '@/lib/haptics'
import { RunnerClassAvatar } from '@/components/avatars/RunnerClassAvatars'

interface Props {
  classId: RunnerClassId
  onDismiss: () => void
}

export default function RunnerClassReveal({ classId, onDismiss }: Props) {
  const cls = getRunnerClass(classId)
  const [phase, setPhase] = useState<'enter' | 'reveal' | 'detail'>('enter')
  const [shared, setShared] = useState(false)

  useEffect(() => {
    hapticSuccess()
    // enter → reveal after 600ms (let the screen paint first)
    const t1 = setTimeout(() => setPhase('reveal'), 600)
    // reveal → detail after 2.2s
    const t2 = setTimeout(() => setPhase('detail'), 2200)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  function handleShare() {
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      navigator.share({
        title: `I'm a ${cls.name} — NextSplit`,
        text: cls.shareText,
        url: 'https://nextsplit-v2.vercel.app',
      }).catch(() => {})
      setShared(true)
    }
  }

  // Colour map for gradient backgrounds per class
  const gradients: Record<RunnerClassId, string> = {
    warming_up:      'from-slate-900 via-slate-800 to-slate-900',
    marathon_runner: 'from-emerald-950 via-emerald-900 to-slate-900',
    speed_merchant:  'from-orange-950 via-red-900 to-slate-900',
    trail_blazer:    'from-amber-950 via-stone-900 to-slate-900',
    base_builder:    'from-blue-950 via-blue-900 to-slate-900',
    all_rounder:     'from-purple-950 via-purple-900 to-slate-900',
    comeback_runner: 'from-pink-950 via-rose-900 to-slate-900',
  }

  const glowColours: Record<RunnerClassId, string> = {
    warming_up:      'rgba(148,163,184,0.3)',
    marathon_runner: 'rgba(43,92,63,0.6)',
    speed_merchant:  'rgba(232,93,38,0.6)',
    trail_blazer:    'rgba(124,92,46,0.6)',
    base_builder:    'rgba(9,132,227,0.6)',
    all_rounder:     'rgba(108,92,231,0.6)',
    comeback_runner: 'rgba(232,67,147,0.6)',
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden">
      {/* Background gradient */}
      <div className={`absolute inset-0 bg-gradient-to-b ${gradients[classId]} transition-all duration-1000`} />

      {/* Glow orb */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl transition-all duration-1000"
        style={{
          width: phase === 'reveal' || phase === 'detail' ? '320px' : '80px',
          height: phase === 'reveal' || phase === 'detail' ? '320px' : '80px',
          background: glowColours[classId],
          opacity: phase === 'enter' ? 0 : 0.7,
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center px-8 text-center max-w-sm mx-auto">

        {/* Pre-reveal */}
        {phase === 'enter' && (
          <div className="animate-pulse">
            <p className="text-white/40 text-sm font-medium tracking-widest uppercase">
              Analysing your training…
            </p>
          </div>
        )}

        {/* Emoji burst + class name */}
        {(phase === 'reveal' || phase === 'detail') && (
          <>
            {/* Label */}
            <p
              className="text-white/50 text-xs font-bold tracking-[0.3em] uppercase mb-6 transition-all duration-700"
              style={{ opacity: phase === 'detail' ? 1 : 0, transform: phase === 'detail' ? 'translateY(0)' : 'translateY(8px)' }}
            >
              Your runner class
            </p>

            {/* Class avatar — illustrated SVG */}
            <div
              className="mb-6 transition-all duration-500"
              style={{
                transform: phase === 'reveal' ? 'scale(1.15)' : 'scale(1)',
                filter: `drop-shadow(0 0 32px ${glowColours[classId]})`,
              }}
            >
              <RunnerClassAvatar classId={classId} size={120} />
            </div>

            {/* Class name */}
            <h1
              className="text-4xl font-black text-white mb-3 transition-all duration-700"
              style={{
                opacity: 1,
                letterSpacing: '-0.02em',
                fontFamily: 'system-ui',
              }}
            >
              {cls.name}
            </h1>

            {/* Tagline */}
            <p
              className="text-white/70 text-base font-medium mb-8 transition-all duration-700"
              style={{ opacity: phase === 'detail' ? 1 : 0, transitionDelay: '200ms' }}
            >
              {cls.tagline}
            </p>
          </>
        )}

        {/* Detail phase — description + actions */}
        {phase === 'detail' && (
          <div
            className="w-full transition-all duration-500"
            style={{ opacity: 1 }}
          >
            {/* Description card */}
            <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl p-5 mb-4 text-left">
              <p className="text-white/80 text-sm leading-relaxed">
                {cls.description}
              </p>
            </div>

            {/* Coaching insight — Character Spec: "personalised coaching insight" */}
            <div className="bg-white/15 backdrop-blur-sm border border-white/20 rounded-2xl p-5 mb-6 text-left">
              <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest mb-2">
                🧠 Coaching insight
              </p>
              <p className="text-white/90 text-sm leading-relaxed">
                {CLASS_COACHING_INSIGHTS[classId]}
              </p>
            </div>

            {/* All classes preview — small chips */}
            <div className="flex flex-wrap justify-center gap-2 mb-8">
              {(Object.values(RUNNER_CLASSES) as typeof RUNNER_CLASSES[keyof typeof RUNNER_CLASSES][]).map(c => (
                <div
                  key={c.id}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${
                    c.id === classId
                      ? 'bg-white text-gray-900 scale-110'
                      : 'bg-white/10 text-white/50'
                  }`}
                >
                  <span>{c.emoji}</span>
                  <span>{c.name}</span>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3">
              {typeof navigator !== 'undefined' && 'share' in navigator && !shared && (
                <button
                  onClick={handleShare}
                  className="w-full py-3.5 rounded-2xl bg-white text-gray-900 text-sm font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  Share my class
                </button>
              )}
              {shared && (
                <div className="w-full py-3 text-center text-white/60 text-sm">
                  ✓ Shared!
                </div>
              )}
              <button
                onClick={onDismiss}
                className="w-full py-3 rounded-2xl bg-white/10 border border-white/10 text-white/70 text-sm font-medium active:scale-95 transition-transform"
              >
                Continue training →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
