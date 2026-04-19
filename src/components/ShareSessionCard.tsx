'use client'

import { useRef, useState } from 'react'
import type { PlanSession, TrainingLog } from '@/types/database'
import { getSessionType, decodeHtml } from '@/lib/sessionUtils'

interface Props {
  session: PlanSession
  log: TrainingLog
  weekN: number
  onClose: () => void
}

function fmtPaceDisplay(paceStr: string | null): string {
  if (!paceStr) return ''
  return `${paceStr}/km`
}

function fmtDuration(secs: number | null): string {
  if (!secs) return ''
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${String(s).padStart(2, '0')}s`
  return `${s}s`
}

export default function ShareSessionCard({ session, log, weekN, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [sharing, setSharing] = useState(false)
  const cfg = getSessionType(session.c)
  const name = decodeHtml(session.n)

  async function handleShare() {
    setSharing(true)
    try {
      const canvas = canvasRef.current
      if (!canvas) return

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      // Canvas: 1080×1080 (square for Instagram/social)
      canvas.width = 1080
      canvas.height = 1080

      // Background
      ctx.fillStyle = '#0D9488'
      ctx.fillRect(0, 0, 1080, 1080)

      // Dark overlay bottom
      const grad = ctx.createLinearGradient(0, 400, 0, 1080)
      grad.addColorStop(0, 'rgba(0,0,0,0)')
      grad.addColorStop(1, 'rgba(0,0,0,0.7)')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, 1080, 1080)

      // Brand
      ctx.fillStyle = 'rgba(255,255,255,0.3)'
      ctx.font = 'bold 32px system-ui, -apple-system, sans-serif'
      ctx.fillText('NEXTSPLIT', 80, 100)

      // Session type emoji
      ctx.font = '120px system-ui'
      ctx.fillText(cfg.emoji, 80, 280)

      // Session name
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 72px system-ui, -apple-system, sans-serif'
      // Word wrap for long names
      const words = name.split(' ')
      let line = ''
      let y = 420
      for (const word of words) {
        const testLine = line + word + ' '
        if (ctx.measureText(testLine).width > 920 && line) {
          ctx.fillText(line.trim(), 80, y)
          line = word + ' '
          y += 88
        } else {
          line = testLine
        }
      }
      ctx.fillText(line.trim(), 80, y)
      y += 80

      // Stats row
      ctx.fillStyle = 'rgba(255,255,255,0.85)'
      ctx.font = '52px system-ui, -apple-system, sans-serif'

      const stats: string[] = []
      if (log.km && log.km > 0) stats.push(`${log.km}km`)
      if (log.pace) stats.push(fmtPaceDisplay(log.pace))
      if (log.duration_secs) stats.push(fmtDuration(log.duration_secs))

      if (stats.length > 0) {
        ctx.fillText(stats.join('  ·  '), 80, y + 20)
        y += 80
      }

      // Week badge
      ctx.fillStyle = 'rgba(255,255,255,0.2)'
      ctx.beginPath()
      ctx.roundRect(80, y + 20, 200, 64, 32)
      ctx.fill()
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 36px system-ui, -apple-system, sans-serif'
      ctx.fillText(`Week ${weekN}`, 110, y + 62)

      // Effort dots
      if (log.effort) {
        const effort = log.effort
        for (let i = 1; i <= 10; i++) {
          ctx.fillStyle = i <= effort ? '#ffffff' : 'rgba(255,255,255,0.2)'
          ctx.beginPath()
          ctx.arc(300 + (i - 1) * 72, y + 55, 20, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      // Bottom tagline
      ctx.fillStyle = 'rgba(255,255,255,0.5)'
      ctx.font = '32px system-ui, -apple-system, sans-serif'
      ctx.fillText('nextsplit.app', 80, 1020)

      // Share
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(b => b ? resolve(b) : reject(new Error('Canvas export failed')), 'image/png')
      })

      const file = new File([blob], 'nextsplit-session.png', { type: 'image/png' })

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: `${name} — NextSplit`,
          text: `Just logged: ${name}${log.km ? ` · ${log.km}km` : ''}${log.pace ? ` · ${fmtPaceDisplay(log.pace)}` : ''} 🏃`,
          files: [file],
        })
      } else {
        // Fallback: download the image
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'nextsplit-session.png'
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') console.error('Share failed', e)
    } finally {
      setSharing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-white rounded-t-3xl p-5 pb-8"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />

        {/* Preview */}
        <div className="rounded-2xl overflow-hidden mb-4 aspect-square bg-[#0D9488] relative flex flex-col justify-end p-5">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/50" />
          <div className="relative z-10">
            <div className="text-4xl mb-2">{cfg.emoji}</div>
            <div className="text-white font-bold text-xl leading-tight">{name}</div>
            <div className="text-white/80 text-sm mt-1 flex gap-3 flex-wrap">
              {log.km && log.km > 0 && <span>{log.km}km</span>}
              {log.pace && <span>{fmtPaceDisplay(log.pace)}</span>}
              {log.duration_secs && <span>{fmtDuration(log.duration_secs)}</span>}
            </div>
            <div className="text-white/50 text-xs mt-2">Week {weekN} · NEXTSPLIT</div>
          </div>
        </div>

        {/* Hidden canvas for actual export */}
        <canvas ref={canvasRef} className="hidden" />

        <button
          onClick={handleShare}
          disabled={sharing}
          className="w-full py-3.5 bg-[#0D9488] text-white font-bold text-sm rounded-2xl disabled:opacity-50 flex items-center justify-center gap-2"
          aria-label="Share this session"
        >
          {sharing ? (
            <span>Preparing…</span>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Share session
            </>
          )}
        </button>
      </div>
    </div>
  )
}
