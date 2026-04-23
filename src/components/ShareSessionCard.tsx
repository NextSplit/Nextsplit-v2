'use client'

import { useRef, useState } from 'react'
import type { PlanSession, TrainingLog } from '@/types/database'
import { getSessionType, decodeHtml } from '@/lib/sessionUtils'
import { getSessionXP } from '@/lib/rpg'

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
  const xp = getSessionXP(session.c)

  const stats: string[] = []
  if (log.km && log.km > 0) stats.push(`${log.km}km`)
  if (log.pace) stats.push(fmtPaceDisplay(log.pace))
  if (log.duration_secs) stats.push(fmtDuration(log.duration_secs))

  async function handleShare() {
    setSharing(true)
    try {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      // 1080×1080 square
      canvas.width = 1080
      canvas.height = 1080

      // ── Background gradient ──────────────────────────────────────────────
      const bg = ctx.createLinearGradient(0, 0, 1080, 1080)
      bg.addColorStop(0, '#0f172a')
      bg.addColorStop(0.5, '#0d3d38')
      bg.addColorStop(1, '#0f172a')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, 1080, 1080)

      // Subtle grid pattern
      ctx.strokeStyle = 'rgba(255,255,255,0.03)'
      ctx.lineWidth = 1
      for (let x = 0; x < 1080; x += 60) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 1080); ctx.stroke()
      }
      for (let y = 0; y < 1080; y += 60) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1080, y); ctx.stroke()
      }

      // Accent circle glow top-right
      const glow = ctx.createRadialGradient(900, 150, 0, 900, 150, 400)
      glow.addColorStop(0, 'rgba(13,148,136,0.25)')
      glow.addColorStop(1, 'rgba(13,148,136,0)')
      ctx.fillStyle = glow
      ctx.fillRect(0, 0, 1080, 1080)

      // ── Top bar ─────────────────────────────────────────────────────────
      ctx.fillStyle = 'rgba(255,255,255,0.08)'
      ctx.fillRect(0, 0, 1080, 90)
      ctx.fillStyle = 'var(--ns-forest)'
      ctx.font = 'bold 28px system-ui, -apple-system, sans-serif'
      ctx.fillText('NEXTSPLIT', 60, 58)
      ctx.fillStyle = 'rgba(255,255,255,0.3)'
      ctx.font = '28px system-ui'
      ctx.fillText('Training Log', 260, 58)

      // Week badge top-right
      ctx.fillStyle = 'rgba(13,148,136,0.3)'
      ctx.beginPath()
      ctx.roundRect(870, 22, 160, 46, 23)
      ctx.fill()
      ctx.fillStyle = '#5eead4'
      ctx.font = 'bold 26px system-ui'
      ctx.fillText(`Week ${weekN}`, 900, 52)

      // ── Session type pill ────────────────────────────────────────────────
      ctx.fillStyle = 'rgba(255,255,255,0.1)'
      ctx.beginPath()
      ctx.roundRect(60, 140, 280, 56, 28)
      ctx.fill()
      ctx.fillStyle = 'var(--ns-forest)'
      ctx.font = 'bold 26px system-ui'
      ctx.fillText(`${cfg.emoji}  ${cfg.label.toUpperCase()}`, 85, 177)

      // ── Session name ─────────────────────────────────────────────────────
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 80px system-ui, -apple-system, sans-serif'
      const words = name.split(' ')
      let line = ''
      let y = 310
      for (const word of words) {
        const test = line + word + ' '
        if (ctx.measureText(test).width > 960 && line) {
          ctx.fillText(line.trim(), 60, y)
          line = word + ' '
          y += 96
        } else { line = test }
      }
      ctx.fillText(line.trim(), 60, y)
      y += 80

      // ── Stats row ────────────────────────────────────────────────────────
      if (stats.length > 0) {
        const statStr = stats.join('   ·   ')
        ctx.fillStyle = 'rgba(255,255,255,0.75)'
        ctx.font = '52px system-ui'
        ctx.fillText(statStr, 60, y + 10)
        y += 80
      }

      // ── Effort bar ───────────────────────────────────────────────────────
      if (log.effort) {
        y += 20
        ctx.fillStyle = 'rgba(255,255,255,0.15)'
        ctx.font = 'bold 26px system-ui'
        ctx.fillText('EFFORT', 60, y)
        ctx.fillStyle = 'rgba(255,255,255,0.6)'
        ctx.font = 'bold 26px system-ui'
        ctx.fillText(`${log.effort}/10`, 210, y)

        // Dots
        for (let i = 1; i <= 10; i++) {
          ctx.fillStyle = i <= log.effort
            ? (log.effort >= 8 ? '#EF4444' : log.effort >= 6 ? '#F59E0B' : '#10B981')
            : 'rgba(255,255,255,0.15)'
          ctx.beginPath()
          ctx.arc(60 + (i - 1) * 68, y + 40, 22, 0, Math.PI * 2)
          ctx.fill()
        }
        y += 100
      }

      // ── XP badge ─────────────────────────────────────────────────────────
      y += 20
      const xpW = 200
      ctx.fillStyle = 'rgba(13,148,136,0.4)'
      ctx.beginPath()
      ctx.roundRect(60, y, xpW, 64, 32)
      ctx.fill()
      ctx.strokeStyle = 'var(--ns-forest)'
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.fillStyle = '#5eead4'
      ctx.font = 'bold 38px system-ui'
      ctx.fillText(`+${xp} XP`, 84, y + 44)

      // Strava badge if imported
      if (log.strava_id) {
        ctx.fillStyle = 'rgba(252,100,25,0.3)'
        ctx.beginPath()
        ctx.roundRect(280, y, 220, 64, 32)
        ctx.fill()
        ctx.fillStyle = '#FC6419'
        ctx.font = 'bold 34px system-ui'
        ctx.fillText('⚡ Strava', 300, y + 44)
      }

      // ── Bottom bar ───────────────────────────────────────────────────────
      ctx.fillStyle = 'rgba(255,255,255,0.05)'
      ctx.fillRect(0, 990, 1080, 90)
      ctx.fillStyle = 'rgba(255,255,255,0.3)'
      ctx.font = '28px system-ui'
      ctx.fillText('nextsplit.app  ·  Track. Log. Level up.', 60, 1044)

      // ── Export + share ───────────────────────────────────────────────────
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(b => b ? resolve(b) : reject(new Error('Export failed')), 'image/png')
      })
      const file = new File([blob], 'nextsplit-session.png', { type: 'image/png' })

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: `${name} — NextSplit`,
          text: `Just logged: ${name}${log.km ? ` · ${log.km}km` : ''}${log.pace ? ` · ${fmtPaceDisplay(log.pace)}` : ''} 🏃`,
          files: [file],
        })
      } else {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url; a.download = 'nextsplit-session.png'; a.click()
        URL.revokeObjectURL(url)
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') console.error('Share failed', e)
    } finally {
      setSharing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/50 justify-end" style={{ backdropFilter: "blur(4px)" }} onClick={onClose}>
      <div className="w-full max-w-lg mx-auto bg-white p-5 pb-8" style={{ borderRadius: "24px 24px 0 0" }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-1 rounded-full" style={{ background: 'var(--color-border-2)' }} />
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-lg"
            style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-tertiary)' }}>×</button>
        </div>

        {/* Preview card — clean light design */}
        <div className="rounded-2xl overflow-hidden mb-4 relative"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          {/* Ember accent bar */}
          <div className="h-1.5" style={{ background: 'linear-gradient(90deg, var(--ns-forest) 0%, var(--ns-ember) 60%, var(--ns-track) 100%)' }} />

          <div className="p-5">
            {/* Top bar */}
            <div className="flex items-center justify-between mb-4">
              <span className="font-display text-sm" style={{ color: 'var(--ns-forest)', letterSpacing: '-0.02em' }}>NextSplit</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-tertiary)' }}>
                Week {weekN}
              </span>
            </div>

            {/* Type pill */}
            <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 mb-3 self-start"
              style={{ background: 'var(--ns-ember-light)' }}>
              <span className="text-sm">{cfg.emoji}</span>
              <span className="text-[10px] font-black uppercase tracking-wide" style={{ color: 'var(--ns-ember)' }}>{cfg.label}</span>
            </div>

            {/* Name */}
            <p className="font-display text-2xl leading-tight mb-2" style={{ color: 'var(--color-text-primary)', letterSpacing: '-0.02em' }}>{name}</p>

            {/* Stats */}
            {stats.length > 0 && (
              <p className="text-sm mb-4 font-data" style={{ color: 'var(--color-text-secondary)' }}>{stats.join('  ·  ')}</p>
            )}

            {/* Effort dots */}
            {log.effort && (
              <div className="flex items-center gap-1 mb-4">
                {Array.from({ length: 10 }, (_, i) => (
                  <div key={i} className="w-2.5 h-2.5 rounded-full"
                    style={{ background: i < log.effort! ? 'var(--ns-ember)' : 'var(--color-surface-3)' }} />
                ))}
                <span className="text-[10px] ml-1" style={{ color: 'var(--color-text-tertiary)' }}>RPE {log.effort}</span>
              </div>
            )}

            {/* XP + bottom */}
            <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
              <span className="text-xs font-black px-2.5 py-0.5 rounded-full"
                style={{ background: 'var(--ns-track-light)', color: 'var(--ns-track)' }}>
                +{xp} XP
              </span>
              {log.strava_id && (
                <span className="text-[10px] font-bold" style={{ color: '#fc4c02' }}>⚡ Strava</span>
              )}
              <span className="text-[9px]" style={{ color: 'var(--color-text-tertiary)' }}>nextsplit.app</span>
            </div>
          </div>
        </div>

        <canvas ref={canvasRef} className="hidden" />

        <button onClick={handleShare} disabled={sharing}
          className="w-full py-3.5 text-white font-bold text-sm rounded-2xl disabled:opacity-50 flex items-center justify-center gap-2" style={{ background: 'var(--ns-ember)' }}>
          {sharing ? 'Preparing…' : (
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
