'use client'

import { useState } from 'react'
import type { PlanSession } from '@/types/database'

interface Props {
  session:  PlanSession
  onReady:  () => void
  onClose:  () => void
}

function getCoachingCue(code: string | undefined | null): string {
  const c = (code ?? '').toLowerCase()
  if (c.includes('tempo'))
    return 'Push to controlled discomfort. You should be able to say single words, not sentences. Hold that edge.'
  if (c.includes('interval') || c.includes('speed'))
    return 'Give everything on the reps. Full recovery between. The recovery is as important as the effort.'
  if (c.includes('long'))
    return 'Stay conversational — if you can\'t talk, slow down. Time on feet matters more than pace today.'
  if (c.includes('recovery'))
    return 'This is active rest. Embarrassingly slow is perfect. You\'re flushing out fatigue, not building fitness.'
  if (c.includes('gym') || c.includes('strength'))
    return 'Focus on form over weight. Controlled eccentric, explosive concentric. Log any new PRs.'
  return 'Easy and controlled. You should feel like you could run forever. Zone 2 — nose breathing if possible.'
}

function getWarmupTip(code: string | undefined | null): string {
  const c = (code ?? '').toLowerCase()
  if (c.includes('tempo') || c.includes('interval'))
    return '10 min easy warm-up before hitting pace. Don\'t skip this.'
  if (c.includes('long'))
    return 'Start the first km 30 sec/km slower than target. Let the body wake up.'
  return 'Dynamic stretches optional. You\'re good to go.'
}

export default function PreRunBrief({ session, onReady, onClose }: Props) {
  const [step, setStep] = useState<'brief' | 'ready'>(  'brief')

  const sessionColour = (() => {
    const c = (session.c ?? '').toLowerCase()
    if (c.includes('tempo'))    return '#ffb800'
    if (c.includes('interval')) return '#ff7438'
    if (c.includes('long'))     return '#4d8aff'
    if (c.includes('recovery')) return '#00e676'
    if (c.includes('gym'))      return '#a855f7'
    return '#00e676'
  })()

  if (step === 'ready') {
    return (
      <div className="fixed inset-0 z-[90] flex flex-col items-center justify-center"
        style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}>
        <div className="text-6xl mb-4" style={{ animation: 'splityBounce 0.6s cubic-bezier(0.34,1.56,0.64,1) both' }}>
          🏃
        </div>
        <p className="text-3xl font-black text-white mb-2" style={{ letterSpacing: '-0.03em' }}>
          Let&apos;s go!
        </p>
        <p className="text-sm mb-8" style={{ color: 'rgba(255,255,255,0.5)' }}>
          {session.km > 0 ? `${session.km}km` : ''} {session.n}
        </p>
        <button onClick={onReady}
          className="px-10 py-4 rounded-2xl font-black text-base"
          style={{ background: sessionColour, color: '#0a0e1a', boxShadow: `0 6px 24px ${sessionColour}60` }}>
          Start session ✓
        </button>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[90] flex flex-col"
      style={{ background: 'var(--color-bg)' }}>

      {/* Header */}
      <div className="px-5 pt-14 pb-4 border-b"
        style={{ borderColor: 'var(--color-border-2)' }}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-black uppercase tracking-widest"
            style={{ color: sessionColour }}>Pre-run brief</p>
          <button onClick={onClose} aria-label="Close"
            className="text-2xl leading-none" style={{ color: 'var(--color-text-tertiary)' }}>×</button>
        </div>
        <h1 className="text-3xl font-black" style={{ color: 'white', letterSpacing: '-0.03em' }}>
          {session.n ?? 'Session'}
        </h1>
        <p className="text-base font-bold mt-0.5" style={{ color: sessionColour }}>
          {session.km > 0 ? `${session.km}km` : ''}{session.det ? ` · ${session.det.split('·')[0]}` : ''}
        </p>
      </div>

      {/* Brief content */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">

        {/* Coach cue */}
        <div className="rounded-2xl p-4"
          style={{ background: `${sessionColour}10`, border: `2.5px solid ${sessionColour}40` }}>
          <p className="text-[10px] font-black uppercase tracking-widest mb-2" style={{ color: sessionColour }}>
            🧠 Coaching cue
          </p>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
            {getCoachingCue(session.c)}
          </p>
        </div>

        {/* Warmup */}
        <div className="rounded-2xl p-4"
          style={{ background: 'var(--color-surface)', border: '2px solid var(--color-border-2)' }}>
          <p className="text-[10px] font-black uppercase tracking-widest mb-2"
            style={{ color: 'var(--color-text-tertiary)' }}>🔥 Warmup</p>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
            {getWarmupTip(session.c)}
          </p>
        </div>

        {/* Target */}
        {session.det && (
          <div className="rounded-2xl p-4"
            style={{ background: 'var(--color-surface)', border: '2px solid var(--color-border-2)' }}>
            <p className="text-[10px] font-black uppercase tracking-widest mb-2"
              style={{ color: 'var(--color-text-tertiary)' }}>🎯 Target</p>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
              {session.det}
            </p>
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="px-5 pb-8" style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom, 0px) + 1rem)' }}>
        <button onClick={() => setStep('ready')}
          className="w-full py-4 rounded-2xl font-black text-base"
          style={{ background: sessionColour, color: '#0a0e1a', boxShadow: `0 6px 24px ${sessionColour}50` }}>
          Ready to run →
        </button>
      </div>
    </div>
  )
}
