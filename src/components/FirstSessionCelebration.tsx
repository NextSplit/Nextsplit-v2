'use client'

/**
 * FirstSessionCelebration
 * Shown once immediately after the user's first ever completed session.
 * Coach voice. Ember/gold aesthetic. Confetti burst.
 * Triggers: allLogs goes from 0 → 1 done sessions.
 */

import { useState, useEffect, useRef } from 'react'

const SEEN_KEY = 'nextsplit_first_session_celebrated'

interface Props {
  totalDone:   number   // total completed sessions across all time
  displayName: string | null
  xp:          number
}

interface Particle {
  id:     number
  x:      number
  y:      number
  vx:     number
  vy:     number
  color:  string
  size:   number
  rot:    number
  vrot:   number
  life:   number
}

const COLORS = ['#e85d26', '#c49a3c', '#2b5c3f', '#4ade80', '#f59e0b', '#60a5fa']

export default function FirstSessionCelebration({ totalDone, displayName, xp }: Props) {
  const [show, setShow]           = useState(false)
  const [visible, setVisible]     = useState(false)
  const canvasRef                 = useRef<HTMLCanvasElement>(null)
  const particles                 = useRef<Particle[]>([])
  const rafRef                    = useRef<number>(0)
  const name                      = displayName?.split(' ')[0] ?? null

  // Trigger on first ever completed session
  useEffect(() => {
    if (totalDone !== 1) return
    try {
      if (localStorage.getItem(SEEN_KEY)) return
    } catch { return }
    // Small delay so log modal closes first
    const t = setTimeout(() => {
      setShow(true)
      setTimeout(() => setVisible(true), 50)
    }, 800)
    return () => clearTimeout(t)
  }, [totalDone])

  // Confetti cannon
  useEffect(() => {
    if (!show || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx    = canvas.getContext('2d')
    if (!ctx) return

    canvas.width  = window.innerWidth
    canvas.height = window.innerHeight

    // Launch particles
    particles.current = Array.from({ length: 80 }, (_, i) => ({
      id:   i,
      x:    canvas.width / 2 + (Math.random() - 0.5) * 100,
      y:    canvas.height * 0.35,
      vx:   (Math.random() - 0.5) * 12,
      vy:   -(Math.random() * 14 + 4),
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: Math.random() * 8 + 4,
      rot:  Math.random() * 360,
      vrot: (Math.random() - 0.5) * 12,
      life: 1,
    }))

    function draw() {
      if (!ctx || !canvas) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      let alive = false
      particles.current.forEach(p => {
        p.x    += p.vx
        p.y    += p.vy
        p.vy   += 0.4   // gravity
        p.vx   *= 0.99  // air resistance
        p.rot  += p.vrot
        p.life -= 0.012
        if (p.life <= 0) return
        alive = true
        ctx.save()
        ctx.globalAlpha = Math.max(0, p.life)
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot * Math.PI / 180)
        ctx.fillStyle = p.color
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6)
        ctx.restore()
      })
      if (alive) rafRef.current = requestAnimationFrame(draw)
    }
    rafRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(rafRef.current)
  }, [show])

  const dismiss = () => {
    try { localStorage.setItem(SEEN_KEY, '1') } catch {}
    setVisible(false)
    setTimeout(() => setShow(false), 300)
  }

  if (!show) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={dismiss}>

      {/* Confetti canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />

      {/* Card — centred, not bottom sheet */}
      <div className={`relative w-full max-w-sm rounded-3xl px-6 pt-8 pb-8 text-center transition-all duration-300 ${
          visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}
        onClick={e => e.stopPropagation()}>

        {/* X close */}
        <button onClick={dismiss}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-lg"
          style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-tertiary)' }}>
          ×
        </button>

        {/* XP badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-4 font-data font-black text-sm"
          style={{ background: 'rgba(196,154,60,0.15)', color: 'var(--ns-track)', border: '1px solid rgba(196,154,60,0.3)' }}>
          +{xp} XP
        </div>

        {/* Headline */}
        <h2 className="font-display text-3xl italic mb-2" style={{ color: 'var(--color-text-primary)' }}>
          {name ? `That's one, ${name}.` : 'First one done.'}
        </h2>

        {/* Coach copy */}
        <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--color-text-secondary)' }}>
          The first session is the hardest. You showed up — that&apos;s what this is built on.
          Come back tomorrow and it gets easier from here.
        </p>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Session',  value: '1st' },
            { label: 'XP earned', value: `${xp}` },
            { label: 'Streak',   value: '1 day 🔥' },
          ].map(s => (
            <div key={s.label} className="rounded-xl py-3"
              style={{ background: 'var(--color-surface-2)' }}>
              <p className="font-data text-base font-black" style={{ color: 'var(--color-text-primary)' }}>
                {s.value}
              </p>
              <p className="text-[9px] mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
                {s.label}
              </p>
            </div>
          ))}
        </div>

        <button onClick={dismiss}
          className="w-full py-4 rounded-2xl font-black text-white active:scale-95 transition-all"
          style={{ background: 'linear-gradient(135deg, var(--ns-ember) 0%, #d44a12 100%)', boxShadow: '0 4px 20px rgba(232,93,38,0.3)' }}>
          Let&apos;s go →
        </button>
      </div>
    </div>
  )
}
