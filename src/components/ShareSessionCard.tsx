'use client'

import { useRef, useState, useEffect } from 'react'
import type { PlanSession, TrainingLog } from '@/types/database'
import { getSessionXP } from '@/lib/rpg'
import { Analytics } from '@/lib/analytics'
import Splity from '@/components/Splity'

interface Props {
  session:      PlanSession
  log:          TrainingLog
  weekN:        number
  onClose:      () => void
  runnerColour?: string
  planName?:    string
  displayName?: string
}

function getSessionMeta(code: string | undefined | null) {
  const c = (code ?? '').toLowerCase()
  if (c.includes('tempo'))                           return { label: 'Tempo',     colour: '#ffb800', emoji: '⚡' }
  if (c.includes('interval') || c.includes('speed')) return { label: 'Intervals', colour: '#ff7438', emoji: '🔥' }
  if (c.includes('long'))                            return { label: 'Long Run',  colour: '#4d8aff', emoji: '🏃' }
  if (c.includes('recovery'))                        return { label: 'Recovery',  colour: '#00e676', emoji: '💚' }
  if (c.includes('gym') || c.includes('strength'))   return { label: 'Strength',  colour: '#a855f7', emoji: '💪' }
  if (c.includes('race'))                            return { label: 'Race',      colour: '#ff2d9e', emoji: '🏁' }
  return { label: 'Easy Run', colour: '#00e676', emoji: '✅' }
}

function fmtPace(paceStr: string | null | undefined): string {
  if (!paceStr) return ''
  return paceStr.includes('/km') ? paceStr : `${paceStr}/km`
}

function fmtDuration(secs: number | null | undefined): string {
  if (!secs) return ''
  const m = Math.floor(secs / 60)
  const s = secs % 60
  const h = Math.floor(m / 60)
  if (h > 0) return `${h}h ${m % 60}m`
  return `${m}m${s > 0 ? ` ${s}s` : ''}`
}

export default function ShareSessionCard({
  session, log, weekN, onClose, runnerColour = '#00d4ff', planName, displayName,
}: Props) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [copying, setCopying] = useState(false)
  const meta    = getSessionMeta(session.c)
  const xp      = getSessionXP(session.c ?? 'easy')

  // P1.6: card surface generated — fire once per mount.
  useEffect(() => {
    Analytics.shareCardGenerated({ session_type: session.c, km: log.km ?? undefined })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleShare() {
    // Web Share API — native share sheet on Android
    const text = [
      `${meta.emoji} Just completed a ${meta.label}!`,
      log.km ? `📍 ${log.km}km` : '',
      log.pace ? `⚡ ${fmtPace(log.pace)}` : '',
      log.effort ? `💪 RPE ${log.effort}/10` : '',
      planName ? `📋 ${planName}` : '',
      `\n🏃 NextSplit — nextsplit.app`,
    ].filter(Boolean).join('\n')

    if (navigator.share) {
      try {
        await navigator.share({ text, title: 'NextSplit session', url: 'https://nextsplit.app' })
        Analytics.shareCardShared({ session_type: session.c, km: log.km ?? undefined, method: 'web_share' })
        onClose()
      } catch { /* cancelled — no event */ }
    } else {
      // Fallback — copy to clipboard
      await navigator.clipboard?.writeText(text)
      Analytics.shareCardShared({ session_type: session.c, km: log.km ?? undefined, method: 'clipboard' })
      setCopying(true)
      setTimeout(() => { setCopying(false); onClose() }, 1500)
    }
  }

  return (
    <div className="fixed inset-0 z-[110] flex flex-col items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}>

      {/* Card — designed to be screenshot-shared */}
      <div ref={cardRef}
        className="w-full max-w-sm rounded-3xl overflow-hidden"
        style={{
          background: `linear-gradient(145deg, #080b14, #0d1120)`,
          border: `3px solid ${meta.colour}`,
          boxShadow: `0 0 0 1px ${meta.colour}20, 0 20px 60px ${meta.colour}30`,
        }}>

        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base font-black" style={{ color: '#00d4ff' }}>NextSplit</span>
          </div>
          <span className="text-xs font-black px-2.5 py-1 rounded-full"
            style={{ background: `${meta.colour}20`, color: meta.colour, border: `1.5px solid ${meta.colour}40` }}>
            {meta.emoji} {meta.label}
          </span>
        </div>

        {/* Main stat — massive */}
        <div className="px-6 pb-2">
          {log.km && log.km > 0 ? (
            <div>
              <span style={{
                fontSize: 72, fontWeight: 900, color: 'white',
                letterSpacing: '-0.05em', lineHeight: 1,
              }}>{log.km}</span>
              <span className="text-3xl font-black ml-2" style={{ color: 'var(--color-text-secondary)' }}>km</span>
            </div>
          ) : (
            <p style={{ fontSize: 36, fontWeight: 900, color: 'white', letterSpacing: '-0.03em' }}>
              {session.n ?? 'Session done'}
            </p>
          )}
        </div>

        {/* Stats row */}
        <div className="px-6 pb-5 flex gap-3">
          {log.pace && (
            <div className="flex-1 rounded-2xl p-3 text-center"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1.5px solid rgba(255,255,255,0.08)' }}>
              <p className="text-lg font-black" style={{ color: meta.colour }}>{fmtPace(log.pace)}</p>
              <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>avg pace</p>
            </div>
          )}
          {log.effort && (
            <div className="flex-1 rounded-2xl p-3 text-center"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1.5px solid rgba(255,255,255,0.08)' }}>
              <p className="text-lg font-black" style={{ color: '#ffb800' }}>{log.effort}/10</p>
              <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>effort</p>
            </div>
          )}
          {log.duration_secs && (
            <div className="flex-1 rounded-2xl p-3 text-center"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1.5px solid rgba(255,255,255,0.08)' }}>
              <p className="text-lg font-black" style={{ color: '#4d8aff' }}>{fmtDuration(log.duration_secs)}</p>
              <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>time</p>
            </div>
          )}
          <div className="flex-1 rounded-2xl p-3 text-center"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1.5px solid rgba(255,255,255,0.08)' }}>
            <p className="text-lg font-black" style={{ color: '#ffb800' }}>+{xp}</p>
            <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>XP</p>
          </div>
        </div>

        {/* Footer with Splity */}
        <div className="px-6 pb-6 flex items-center gap-3 border-t"
          style={{ borderColor: 'rgba(255,255,255,0.06)', paddingTop: 16 }}>
          <Splity size={40} mood="celebrating" animate={false} />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black" style={{ color: 'var(--color-text-primary)' }}>
              {displayName ?? 'Runner'}
            </p>
            {planName && (
              <p className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>📋 {planName}</p>
            )}
          </div>
          <p className="text-[10px] font-bold" style={{ color: 'rgba(255,255,255,0.3)' }}>nextsplit.app</p>
        </div>
      </div>

      {/* Actions */}
      <div className="w-full max-w-sm mt-4 flex gap-3">
        <button onClick={onClose}
          className="flex-1 py-3.5 rounded-2xl text-sm font-black"
          style={{ background: 'rgba(255,255,255,0.08)', color: 'white', border: '2px solid rgba(255,255,255,0.12)' }}>
          Close
        </button>
        <button onClick={handleShare}
          className="flex-1 py-3.5 rounded-2xl text-sm font-black"
          style={{ background: meta.colour, color: '#0a0e1a', boxShadow: `0 4px 20px ${meta.colour}50` }}>
          {copying ? '✓ Copied!' : '📤 Share'}
        </button>
      </div>
    </div>
  )
}
