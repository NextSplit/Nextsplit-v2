'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { getLevelForXP, getXPProgress, RPG_LEVELS } from '@/lib/rpg'
import type { PlanSession, TrainingLog } from '@/types/database'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  session:    PlanSession
  log:        TrainingLog
  xpEarned:  number
  totalXP:   number
  onDismiss: () => void
  onShare?:  () => void
}

// ── Confetti particle ─────────────────────────────────────────────────────────

interface Particle {
  id:      number
  x:       number
  y:       number
  vx:      number
  vy:      number
  rot:     number
  rotV:    number
  colour:  string
  shape:   'rect' | 'circle' | 'star'
  size:    number
  opacity: number
  life:    number
}

const CONFETTI_COLOURS = [
  '#ff4d6d', '#06b6d4', '#84cc16', '#f0a500',
  '#8b5cf6', '#ec4899', '#22c55e', '#3b82f6',
]

function makeParticle(id: number, w: number): Particle {
  const shapes: ('rect' | 'circle' | 'star')[] = ['rect', 'circle', 'rect', 'rect']
  return {
    id,
    x:       Math.random() * w,
    y:       -20,
    vx:      (Math.random() - 0.5) * 6,
    vy:      Math.random() * 4 + 3,
    rot:     Math.random() * 360,
    rotV:    (Math.random() - 0.5) * 12,
    colour:  CONFETTI_COLOURS[Math.floor(Math.random() * CONFETTI_COLOURS.length)],
    shape:   shapes[Math.floor(Math.random() * shapes.length)],
    size:    Math.random() * 8 + 4,
    opacity: 1,
    life:    1,
  }
}

// ── Session type colours ──────────────────────────────────────────────────────

function getSessionStyle(code: string | undefined | null): {
  gradient: string; glow: string; emoji: string; label: string
} {
  const c = (code ?? '').toLowerCase()
  if (c.includes('long'))                            return { gradient: 'linear-gradient(135deg,#1d4ed8,#1e40af)', glow: '#3b82f6', emoji: '🏃', label: 'Long Run' }
  if (c.includes('tempo'))                           return { gradient: 'linear-gradient(135deg,#a16207,#854d0e)', glow: '#eab308', emoji: '⚡', label: 'Tempo' }
  if (c.includes('interval') || c.includes('speed')) return { gradient: 'linear-gradient(135deg,#c2410c,#9a3412)', glow: '#f97316', emoji: '🔥', label: 'Intervals' }
  if (c.includes('recovery'))                        return { gradient: 'linear-gradient(135deg,#047857,#065f46)', glow: '#4ade80', emoji: '💚', label: 'Recovery' }
  if (c.includes('gym') || c.includes('strength'))   return { gradient: 'linear-gradient(135deg,#6d28d9,#5b21b6)', glow: '#8b5cf6', emoji: '💪', label: 'Strength' }
  if (c.includes('race'))                            return { gradient: 'linear-gradient(135deg,#be185d,#9d174d)', glow: '#ec4899', emoji: '🏁', label: 'Race' }
  return { gradient: 'linear-gradient(135deg,#15803d,#166534)', glow: '#22c55e', emoji: '✅', label: 'Easy Run' }
}

// ── XP number floater ─────────────────────────────────────────────────────────

function XPFloat({ xp, colour }: { xp: number; colour: string }) {
  return (
    <div className="animate-bounce-up text-center pointer-events-none"
      style={{
        animation: 'xpFloat 1.2s ease-out forwards',
        fontSize: 52,
        fontWeight: 900,
        color: colour,
        textShadow: `0 0 40px ${colour}80`,
        letterSpacing: '-0.03em',
      }}>
      +{xp}
      <span style={{ fontSize: 28, marginLeft: 4 }}>XP</span>
    </div>
  )
}

// ── Level up burst ────────────────────────────────────────────────────────────

function LevelUpBurst({ newLevel, colour }: { newLevel: number; colour: string }) {
  return (
    <div className="text-center"
      style={{ animation: 'levelBurst 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' }}>
      <div className="text-5xl mb-2" style={{ animation: 'spin360 0.8s ease-out' }}>⭐</div>
      <div className="text-2xl font-black text-white" style={{ letterSpacing: '-0.02em' }}>
        Level {newLevel}!
      </div>
      <div className="text-sm mt-1" style={{ color: colour }}>
        {RPG_LEVELS.find(l => l.level === newLevel)?.name ?? 'Runner'}
      </div>
    </div>
  )
}

// ── Splity character ──────────────────────────────────────────────────────────

function Splity({ mood }: { mood: 'excited' | 'proud' | 'fire' }) {
  const face = mood === 'fire' ? '🔥' : mood === 'excited' ? '🎉' : '⭐'
  return (
    <div className="flex flex-col items-center gap-1"
      style={{ animation: 'splityBounce 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s both' }}>
      {/* Body */}
      <div className="relative">
        <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl"
          style={{
            background: 'linear-gradient(135deg,#06b6d4,#0891b2)',
            boxShadow: '0 8px 32px rgba(6,182,212,0.5)',
          }}>
          🏃
        </div>
        {/* Expression badge */}
        <div className="absolute -top-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center text-lg"
          style={{ background: '#0c0c0c', border: '2px solid #06b6d4' }}>
          {face}
        </div>
      </div>
      <p className="text-xs font-bold" style={{ color: '#06b6d4' }}>Splity</p>
    </div>
  )
}

// ── Main celebration ──────────────────────────────────────────────────────────

export default function SessionCelebration({
  session, log, xpEarned, totalXP, onDismiss, onShare,
}: Props) {
  const canvasRef        = useRef<HTMLCanvasElement>(null)
  const particlesRef     = useRef<Particle[]>([])
  const animFrameRef     = useRef<number>(0)
  const [phase, setPhase] = useState<'enter' | 'show' | 'exit'>('enter')
  const [showLevelUp, setShowLevelUp] = useState(false)
  const [newLevel, setNewLevel]       = useState<number | null>(null)

  // Check for level up
  const prevXP    = totalXP - xpEarned
  const prevLevel = getLevelForXP(prevXP).level
  const currLevel = getLevelForXP(totalXP).level
  const leveledUp = currLevel > prevLevel

  const xpPct     = getXPProgress(totalXP)
  const style     = getSessionStyle(session.c)

  // Sound effect (Android only — graceful fail on iOS)
  const playSound = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
      // Victory chord: ascending notes
      const notes = leveledUp
        ? [523, 659, 784, 1047] // C E G C — level up fanfare
        : [523, 659, 784]       // C E G — session complete
      notes.forEach((freq, i) => {
        const osc  = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.frequency.value = freq
        osc.type = 'sine'
        gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.12)
        gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + i * 0.12 + 0.05)
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + i * 0.12 + 0.25)
        osc.start(ctx.currentTime + i * 0.12)
        osc.stop(ctx.currentTime + i * 0.12 + 0.3)
      })
    } catch { /* iOS or restricted — silent fail */ }
  }, [leveledUp])

  // Haptic feedback (Android Chrome)
  const vibrate = useCallback(() => {
    try {
      if (leveledUp) {
        navigator.vibrate?.([100, 50, 100, 50, 200])
      } else {
        navigator.vibrate?.([80, 40, 80])
      }
    } catch { /* not supported */ }
  }, [leveledUp])

  // Confetti canvas animation
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx2d  = canvas.getContext('2d')
    if (!ctx2d) return

    canvas.width  = window.innerWidth
    canvas.height = window.innerHeight

    // Spawn burst of particles
    const burst = Array.from({ length: 80 }, (_, i) => makeParticle(i, canvas.width))
    particlesRef.current = burst

    let frame = 0
    function animate() {
      if (!canvas || !ctx2d) return
      ctx2d.clearRect(0, 0, canvas.width, canvas.height)

      particlesRef.current = particlesRef.current
        .map(p => ({
          ...p,
          x:       p.x + p.vx,
          y:       p.y + p.vy,
          vy:      p.vy + 0.15, // gravity
          rot:     p.rot + p.rotV,
          life:    p.life - 0.008,
          opacity: Math.max(0, p.life - 0.2) * 1.25,
        }))
        .filter(p => p.life > 0 && p.y < canvas.height + 20)

      // Add more particles in first 30 frames
      if (frame < 30 && frame % 4 === 0) {
        for (let i = 0; i < 6; i++) {
          particlesRef.current.push(makeParticle(Date.now() + i, canvas.width))
        }
      }

      particlesRef.current.forEach(p => {
        ctx2d.save()
        ctx2d.globalAlpha = p.opacity
        ctx2d.translate(p.x, p.y)
        ctx2d.rotate((p.rot * Math.PI) / 180)
        ctx2d.fillStyle = p.colour

        if (p.shape === 'circle') {
          ctx2d.beginPath()
          ctx2d.arc(0, 0, p.size / 2, 0, Math.PI * 2)
          ctx2d.fill()
        } else if (p.shape === 'star') {
          ctx2d.font = `${p.size * 2}px serif`
          ctx2d.fillText('✦', -p.size, p.size)
        } else {
          ctx2d.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2)
        }
        ctx2d.restore()
      })

      frame++
      if (particlesRef.current.length > 0 || frame < 80) {
        animFrameRef.current = requestAnimationFrame(animate)
      }
    }

    animate()
    return () => cancelAnimationFrame(animFrameRef.current)
  }, [])

  // Sequence: enter → play sounds → show level up if applicable → ready to dismiss
  useEffect(() => {
    vibrate()
    const t1 = setTimeout(() => { playSound(); setPhase('show') }, 200)
    const t2 = leveledUp ? setTimeout(() => setShowLevelUp(true), 1000) : null
    if (leveledUp) setNewLevel(currLevel)
    return () => { clearTimeout(t1); if (t2) clearTimeout(t2) }
  }, [playSound, vibrate, leveledUp, currLevel])

  const splityMood = leveledUp ? 'fire' : session.c?.includes('long') ? 'proud' : 'excited'

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
      style={{
        background: `radial-gradient(ellipse at 50% 30%, ${style.glow}20 0%, #0c0c0c 70%)`,
        animation: phase === 'enter' ? 'fadeIn 0.4s ease-out forwards' : undefined,
      }}
      onClick={onDismiss}>

      {/* Confetti canvas */}
      <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none" style={{ zIndex: 101 }} />

      {/* Content */}
      <div className="relative z-[102] flex flex-col items-center px-6 w-full max-w-sm"
        style={{ animation: 'slideUp 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' }}
        onClick={e => e.stopPropagation()}>

        {/* Splity */}
        <Splity mood={splityMood} />

        {/* Session type pill */}
        <div className="mt-6 px-5 py-2 rounded-full text-sm font-black"
          style={{ background: style.gradient, boxShadow: `0 4px 20px ${style.glow}60` }}>
          {style.emoji} {style.label} Complete
        </div>

        {/* XP earned */}
        <div className="mt-6">
          <XPFloat xp={xpEarned} colour={style.glow} />
        </div>

        {/* Level up burst */}
        {showLevelUp && newLevel && (
          <div className="mt-4">
            <LevelUpBurst newLevel={newLevel} colour={style.glow} />
          </div>
        )}

        {/* Session stats */}
        <div className="mt-6 w-full rounded-2xl p-4 flex gap-4"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
          {log.km && log.km > 0 && (
            <div className="flex-1 text-center">
              <p className="text-2xl font-black text-white">{log.km}</p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>km</p>
            </div>
          )}
          {log.effort && (
            <div className="flex-1 text-center">
              <p className="text-2xl font-black text-white">{log.effort}</p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>RPE</p>
            </div>
          )}
          {log.duration_secs && log.duration_secs > 0 && (
            <div className="flex-1 text-center">
              <p className="text-2xl font-black text-white">
                {Math.floor(log.duration_secs / 60)}m
              </p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>time</p>
            </div>
          )}
          <div className="flex-1 text-center">
            <p className="text-2xl font-black" style={{ color: style.glow }}>{totalXP}</p>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>total XP</p>
          </div>
        </div>

        {/* XP progress bar to next level */}
        <div className="mt-3 w-full">
          <div className="flex justify-between text-xs mb-1.5"
            style={{ color: 'rgba(255,255,255,0.35)' }}>
            <span>Lv {getLevelForXP(totalXP).level} · {getLevelForXP(totalXP).name}</span>
            <span>{Math.round(xpPct * 100)}% to next</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <div className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${xpPct * 100}%`,
                background: `linear-gradient(90deg, ${style.glow}, #f0a500)`,
                boxShadow: `0 0 8px ${style.glow}80`,
              }} />
          </div>
        </div>

        {/* Action buttons */}
        <div className="mt-6 w-full flex gap-3">
          {onShare && (
            <button
              onClick={onShare}
              className="flex-1 py-3.5 rounded-2xl text-sm font-black"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: 'white' }}>
              📤 Share
            </button>
          )}
          <button
            onClick={onDismiss}
            className="flex-1 py-3.5 rounded-2xl text-sm font-black text-white"
            style={{ background: style.gradient, boxShadow: `0 4px 20px ${style.glow}50` }}>
            Keep going 🏃
          </button>
        </div>

        <p className="mt-4 text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
          Tap anywhere to dismiss
        </p>
      </div>
    </div>
  )
}
