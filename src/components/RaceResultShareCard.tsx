'use client'

import { useState, useRef } from 'react'
import { getRunnerClass } from '@/lib/rpg'
import type { RunnerClassId } from '@/lib/rpg'

interface Props {
  // Plan context
  planName: string
  totalWeeks: number
  raceDate?: string
  // Stats
  totalKm: number
  sessionsDone: number
  longestRun: number
  bestPace?: string          // e.g. "4:52"
  // Identity
  displayName: string
  runnerClass?: RunnerClassId | null
  // Callbacks
  onClose: () => void
}

export default function RaceResultShareCard({
  planName,
  totalWeeks,
  raceDate,
  totalKm,
  sessionsDone,
  longestRun,
  bestPace,
  displayName,
  runnerClass,
  onClose,
}: Props) {
  const [sharing, setSharing] = useState(false)
  const [copied, setCopied] = useState(false)
  const cls = getRunnerClass(runnerClass)

  const shareText = `${cls.emoji} "${cls.shareText.replace('NextSplit', '').trim()}\n\n📋 ${planName}\n📅 ${totalWeeks} weeks · ${Math.round(totalKm)}km logged · ${sessionsDone} sessions\n${longestRun > 0 ? `🏃 Longest run: ${longestRun}km\n` : ''}${bestPace ? `⚡ Best pace: ${bestPace}/km\n` : ''}\nnextsplit.app`

  async function handleShare() {
    setSharing(true)
    try {
      const nav = navigator as Navigator & { share?: (data: ShareData) => Promise<void> }
      if (nav.share) {
        await nav.share({
          title: `${displayName} finished their plan — NextSplit`,
          text: shareText,
          url: 'https://nextsplit.app',
        })
      } else if (nav.clipboard) {
        await nav.clipboard.writeText(shareText)
        setCopied(true)
        setTimeout(() => setCopied(false), 3000)
      }
    } catch { /* user cancelled */ }
    finally { setSharing(false) }
  }

  // Class-specific gradient
  const gradients: Record<string, string> = {
    marathon_runner: 'from-emerald-900 via-emerald-800 to-slate-900',
    speed_merchant:  'from-orange-900 via-red-800 to-slate-900',
    trail_blazer:    'from-stone-800 via-amber-900 to-slate-900',
    base_builder:    'from-blue-900 via-blue-800 to-slate-900',
    all_rounder:     'from-purple-900 via-purple-800 to-slate-900',
    comeback_runner: 'from-pink-900 via-rose-800 to-slate-900',
    warming_up:      'from-slate-800 via-slate-700 to-slate-900',
  }

  const gradient = gradients[runnerClass ?? 'warming_up'] ?? gradients.warming_up

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70" onClick={onClose}>
      <div
        className="w-full max-w-lg mx-auto rounded-t-3xl overflow-hidden shadow-2xl animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        {/* The card itself — this is what gets shared */}
        <div className={`bg-gradient-to-b ${gradient} px-6 pt-8 pb-6`}>
          {/* Handle */}
          <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-6" />

          {/* Header — brand moment */}
          <div className="text-center mb-6">
            <p className="text-white/50 text-xs font-bold tracking-[0.25em] uppercase mb-2">
              Plan complete
            </p>
            <h2 className="text-2xl font-black text-white leading-tight mb-1">
              Got me to the<br />start line ready.
            </h2>
            <p className="text-white/50 text-xs">— {displayName}, NextSplit</p>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              { value: `${Math.round(totalKm)}km`, label: 'Total distance' },
              { value: `${sessionsDone}`, label: 'Sessions done' },
              { value: `${totalWeeks}wk`, label: 'Training block' },
            ].map(s => (
              <div key={s.label} className="bg-white/10 rounded-2xl px-3 py-3 text-center">
                <p className="text-xl font-black text-white">{s.value}</p>
                <p className="text-[10px] text-white/50 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Extra stats row */}
          {(longestRun > 0 || bestPace) && (
            <div className="flex gap-3 mb-5">
              {longestRun > 0 && (
                <div className="flex-1 bg-white/10 rounded-2xl px-3 py-2.5 flex items-center gap-2">
                  <span className="text-lg">🏃</span>
                  <div>
                    <p className="text-sm font-bold text-white">{longestRun}km</p>
                    <p className="text-[10px] text-white/50">Longest run</p>
                  </div>
                </div>
              )}
              {bestPace && (
                <div className="flex-1 bg-white/10 rounded-2xl px-3 py-2.5 flex items-center gap-2">
                  <span className="text-lg">⚡</span>
                  <div>
                    <p className="text-sm font-bold text-white">{bestPace}/km</p>
                    <p className="text-[10px] text-white/50">Best pace</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Plan name + runner class */}
          <div className="flex items-center justify-between bg-white/10 rounded-2xl px-4 py-3 mb-6">
            <div>
              <p className="text-xs font-bold text-white">{planName}</p>
              {raceDate && (
                <p className="text-[10px] text-white/50 mt-0.5">
                  Race: {new Date(raceDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              )}
            </div>
            {runnerClass && runnerClass !== 'warming_up' && (
              <div className="flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1">
                <span className="text-sm">{cls.emoji}</span>
                <span className="text-[11px] font-bold text-white/80">{cls.name}</span>
              </div>
            )}
          </div>

          {/* Branding */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="w-5 h-5 rounded-full bg-[var(--ns-ember)] flex items-center justify-center">
              <span className="text-[10px] font-black text-white">N</span>
            </div>
            <span className="text-white/40 text-xs font-semibold tracking-wider">NEXTSPLIT</span>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-white px-5 py-5 space-y-3">
          <button
            onClick={handleShare}
            disabled={sharing}
            className="w-full py-4 rounded-2xl text-sm font-bold text-white disabled:opacity-50 active:scale-95 transition-all flex items-center justify-center gap-2"
            style={{ background: 'var(--ns-ember)' }}
          >
            {sharing ? (
              'Sharing…'
            ) : copied ? (
              '✓ Copied to clipboard'
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                Share your achievement
              </>
            )}
          </button>
          <button
            onClick={onClose}
            className="w-full py-3 text-sm text-gray-400 font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
