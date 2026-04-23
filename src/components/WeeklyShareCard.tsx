import * as Sentry from '@/lib/sentry'
'use client'

import { useRef, useState } from 'react'

interface Props {
  weekN: number
  totalWeeks: number
  sessionsDone: number
  sessionsPlanned: number
  kmLogged: number
  streak: number
  xpEarned: number
  planName: string
  onClose: () => void
}

export default function WeeklyShareCard({
  weekN, totalWeeks, sessionsDone, sessionsPlanned, kmLogged,
  streak, xpEarned, planName, onClose
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [sharing, setSharing] = useState(false)
  const pct = sessionsPlanned > 0 ? Math.round((sessionsDone / sessionsPlanned) * 100) : 0
  const emoji = pct >= 90 ? '🌟' : pct >= 60 ? '✅' : '💪'

  async function handleShare() {
    setSharing(true)
    try {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      canvas.width = 1080
      canvas.height = 1080

      // Background
      const bg = ctx.createLinearGradient(0, 0, 1080, 1080)
      bg.addColorStop(0, 'var(--color-surface)')
      bg.addColorStop(1, '#0d3d38')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, 1080, 1080)

      // Grid
      ctx.strokeStyle = 'rgba(255,255,255,0.03)'
      ctx.lineWidth = 1
      for (let x = 0; x < 1080; x += 60) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,1080); ctx.stroke() }
      for (let y = 0; y < 1080; y += 60) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(1080,y); ctx.stroke() }

      // Glow
      const glow = ctx.createRadialGradient(200, 900, 0, 200, 900, 500)
      glow.addColorStop(0, 'rgba(13,148,136,0.2)')
      glow.addColorStop(1, 'rgba(13,148,136,0)')
      ctx.fillStyle = glow
      ctx.fillRect(0, 0, 1080, 1080)

      // Top bar
      ctx.fillStyle = 'rgba(255,255,255,0.06)'
      ctx.fillRect(0, 0, 1080, 90)
      ctx.fillStyle = 'var(--ns-ember)'
      ctx.font = 'bold 30px system-ui'
      ctx.fillText('NEXTSPLIT', 60, 58)
      ctx.fillStyle = 'rgba(255,255,255,0.3)'
      ctx.font = '28px system-ui'
      ctx.fillText('Weekly Summary', 270, 58)

      // Plan name
      ctx.fillStyle = 'rgba(255,255,255,0.4)'
      ctx.font = '30px system-ui'
      ctx.fillText(planName, 60, 152)

      // Week label
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 100px system-ui'
      ctx.fillText(`Week ${weekN}`, 60, 280)

      // Progress bar
      const barY = 320
      ctx.fillStyle = 'rgba(255,255,255,0.1)'
      ctx.beginPath(); ctx.roundRect(60, barY, 960, 24, 12); ctx.fill()
      ctx.fillStyle = pct >= 90 ? '#10B981' : 'var(--ns-ember)'
      ctx.beginPath(); ctx.roundRect(60, barY, Math.max(24, 960 * pct / 100), 24, 12); ctx.fill()
      ctx.fillStyle = 'rgba(255,255,255,0.5)'
      ctx.font = '26px system-ui'
      ctx.fillText(`${pct}% complete`, 60, barY + 56)

      // Big emoji
      ctx.font = '120px system-ui'
      ctx.fillText(emoji, 820, 320)

      // Stats grid
      const statY = 460
      const stats = [
        { label: 'SESSIONS', value: `${sessionsDone}/${sessionsPlanned}`, colour: '#5eead4' },
        { label: 'KM LOGGED', value: `${Math.round(kmLogged * 10) / 10}`, colour: '#34d399' },
        { label: 'STREAK', value: `${streak}d 🔥`, colour: '#fb923c' },
        { label: 'XP EARNED', value: `+${xpEarned}`, colour: '#a78bfa' },
      ]

      stats.forEach((s, i) => {
        const col = i % 2
        const row = Math.floor(i / 2)
        const x = 60 + col * 520
        const y = statY + row * 220

        ctx.fillStyle = 'rgba(255,255,255,0.06)'
        ctx.beginPath(); ctx.roundRect(x, y, 480, 180, 20); ctx.fill()

        ctx.fillStyle = s.colour
        ctx.font = 'bold 72px system-ui'
        ctx.fillText(s.value, x + 30, y + 100)
        ctx.fillStyle = 'rgba(255,255,255,0.35)'
        ctx.font = 'bold 24px system-ui'
        ctx.fillText(s.label, x + 30, y + 148)
      })

      // Week progress bar bottom
      const prgY = 960
      ctx.fillStyle = 'rgba(255,255,255,0.05)'
      ctx.fillRect(0, prgY, 1080, 3)
      ctx.fillStyle = 'var(--ns-ember)'
      ctx.fillRect(0, prgY, 1080 * (weekN / totalWeeks), 3)

      ctx.fillStyle = 'rgba(255,255,255,0.05)'
      ctx.fillRect(0, 990, 1080, 90)
      ctx.fillStyle = 'rgba(255,255,255,0.3)'
      ctx.font = '28px system-ui'
      ctx.fillText(`nextsplit.app  ·  Week ${weekN} of ${totalWeeks}`, 60, 1044)

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(b => b ? resolve(b) : reject(new Error('Export failed')), 'image/png')
      })
      const file = new File([blob], `nextsplit-week-${weekN}.png`, { type: 'image/png' })

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: `Week ${weekN} done — NextSplit`,
          text: `Week ${weekN} complete ${emoji} ${sessionsDone}/${sessionsPlanned} sessions · ${Math.round(kmLogged)}km logged 🏃 #NextSplit`,
          files: [file],
        })
      } else {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url; a.download = `nextsplit-week-${weekN}.png`; a.click()
        URL.revokeObjectURL(url)
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') Sentry.captureException(e, { context: 'Weekly share' })
    } finally {
      setSharing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg bg-white rounded-t-3xl p-5 pb-8 animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />

        {/* Preview */}
        <div className="rounded-2xl overflow-hidden mb-4 p-5 aspect-square relative"
          style={{ background: 'linear-gradient(135deg, #0f172a 0%, #0d3d38 100%)' }}>
          <div className="absolute inset-0" style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
            backgroundSize: '28px 28px'
          }} />
          <div className="relative z-10 h-full flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[var(--ns-forest-mid)] font-black text-xs tracking-widest">NEXTSPLIT</span>
              <span className="text-white/40 text-[10px]">{planName}</span>
            </div>
            <div className="text-white font-black text-2xl mb-1">Week {weekN} {emoji}</div>
            <div className="h-1.5 bg-white/10 rounded-full mb-1">
              <div className="h-full bg-[var(--ns-forest-mid)] rounded-full" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-white/40 text-[10px] mb-4">{pct}% complete</p>
            <div className="grid grid-cols-2 gap-2 flex-1">
              {[
                { label: 'Sessions', value: `${sessionsDone}/${sessionsPlanned}`, colour: 'text-[var(--ns-forest-light)]' },
                { label: 'km logged', value: `${Math.round(kmLogged * 10) / 10}`, colour: 'text-emerald-300' },
                { label: 'Streak', value: `${streak}d 🔥`, colour: 'text-orange-300' },
                { label: 'XP earned', value: `+${xpEarned}`, colour: 'text-violet-300' },
              ].map(s => (
                <div key={s.label} className="bg-white/5 rounded-xl p-3 flex flex-col justify-between">
                  <div className={`text-lg font-black ${s.colour}`}>{s.value}</div>
                  <div className="text-white/30 text-[9px] font-bold uppercase tracking-wide">{s.label}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 text-white/20 text-[9px] text-right">nextsplit.app</div>
          </div>
        </div>

        <canvas ref={canvasRef} className="hidden" />

        <button onClick={handleShare} disabled={sharing}
          className="w-full py-3.5 bg-[var(--ns-ember)] text-white font-bold text-sm rounded-2xl disabled:opacity-50 flex items-center justify-center gap-2">
          {sharing ? 'Preparing…' : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Share week {weekN}
            </>
          )}
        </button>
      </div>
    </div>
  )
}
