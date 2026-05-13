'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { getLevelForXP, getXPProgress, RPG_LEVELS } from '@/lib/rpg'
import { Analytics } from '@/lib/analytics'
import { hapticCelebration, hapticSuccess } from '@/lib/haptics'
import { getCelebrationSoundMuted, setCelebrationSoundMuted } from '@/lib/celebrationPrefs'
import Splity from './Splity'
import type { PlanSession, TrainingLog } from '@/types/database'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  session:    PlanSession
  log:        TrainingLog
  xpEarned:  number
  totalXP:   number
  onDismiss: () => void
  onShare?:  () => void
  // P1.1 squad-feed wire-up. `feedCardIds` arrives asynchronously after the
  // shareSessionWithSquadAction server action resolves. Render states:
  //   undefined        → "Sharing with squad…" placeholder (brief)
  //   []               → user has no active squad / opted out → hide section
  //   [...uuids]       → "Posted to your squad's feed" preview
  //   feedError set    → empty-state copy ("share when you're ready")
  feedCardIds?: string[]
  feedError?:   string | null
  // P1.1 amendment: ACWR-band gated copy. When 0.8 ≤ acwr ≤ 1.3, the
  // celebration shows a single Splity-reaction line citing the figure.
  // Outside the band, copy falls back to a generic "great work" with no
  // ACWR mention (per coach-domain-expert R2 — overrules the original
  // unconditional ACWR injection that could surprise users in danger zones).
  acwr?: number | null
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

// ── Main celebration ──────────────────────────────────────────────────────────

export default function SessionCelebration({
  session, log, xpEarned, totalXP, onDismiss, onShare,
  feedCardIds, feedError, acwr,
}: Props) {
  const canvasRef        = useRef<HTMLCanvasElement>(null)
  const particlesRef     = useRef<Particle[]>([])
  const animFrameRef     = useRef<number>(0)
  const [phase, setPhase] = useState<'enter' | 'show' | 'exit'>('enter')
  const [showLevelUp, setShowLevelUp] = useState(false)
  const [newLevel, setNewLevel]       = useState<number | null>(null)
  const [muted, setMuted]             = useState(false)
  // Hydrate persisted mute preference once on mount.
  useEffect(() => { setMuted(getCelebrationSoundMuted()) }, [])
  const toggleMute = useCallback(() => {
    setMuted(prev => { const next = !prev; setCelebrationSoundMuted(next); return next })
  }, [])

  // Check for level up
  const prevXP    = totalXP - xpEarned
  const prevLevel = getLevelForXP(prevXP).level
  const currLevel = getLevelForXP(totalXP).level
  const leveledUp = currLevel > prevLevel

  const xpPct     = getXPProgress(totalXP)
  const style     = getSessionStyle(session.c)

  // Sound effect (Android only — graceful fail on iOS)
  const playSound = useCallback(() => {
    if (getCelebrationSoundMuted()) return
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

  // Haptic feedback (Android Chrome) — canonical helpers, no inline patterns.
  const vibrate = useCallback(() => {
    if (leveledUp) hapticCelebration()
    else           hapticSuccess()
  }, [leveledUp])

  // Confetti canvas animation (skipped under prefers-reduced-motion, WCAG 2.3.3)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

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

  // P1.6: fire celebration_screen_shown once per mount. Props let funnel
  // reports slice by session type, level-up vs. not, PB vs. not, and
  // whether the ACWR-band reaction line cited the figure.
  useEffect(() => {
    Analytics.celebrationScreenShown({
      session_type: session.c,
      leveled_up:   leveledUp,
      has_pb:       false,  // PB toast lives in TodayClient state; the
                            // celebration doesn't yet know. Wire pb signal
                            // through props in a follow-up if the funnel
                            // needs it.
      in_acwr_band: typeof acwr === 'number' && acwr >= 0.8 && acwr <= 1.3,
    })
    // Mount-only; deps intentionally empty so re-renders don't re-fire.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // PR E2 — coordinate with CharacterStatToast. The toast otherwise fires
  // underneath the celebration on the same log, producing the "multi-modal
  // confetti sequence" the founder flagged. Broadcast lifecycle events so
  // the global toast holds (and then flushes) its queue around us.
  useEffect(() => {
    if (typeof window === 'undefined') return
    window.dispatchEvent(new CustomEvent('nextsplit:celebration-shown'))
    return () => {
      window.dispatchEvent(new CustomEvent('nextsplit:celebration-dismissed'))
    }
  }, [])

  const splityMood: 'celebrating' | 'happy' | 'excited' =
    leveledUp ? 'celebrating' : session.c?.includes('long') ? 'happy' : 'excited'

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
      style={{
        // Layered: glow on top, opaque navy base underneath. The previous
        // backdrop had a semi-transparent centre, so home-page content
        // (km-week tile, hero card) bled through behind the +XP number.
        // Opaque base guarantees readability regardless of what's underneath.
        background: `
          radial-gradient(ellipse at 50% 30%, ${style.glow}33 0%, transparent 60%),
          #0a0e1a
        `,
        animation: phase === 'enter' ? 'fadeIn 0.4s ease-out forwards' : undefined,
      }}
      onClick={onDismiss}>

      {/* Mute toggle — top-right, doesn't dismiss the modal */}
      <button
        onClick={e => { e.stopPropagation(); toggleMute() }}
        aria-label={muted ? 'Unmute celebration sound' : 'Mute celebration sound'}
        className="absolute top-4 right-4 z-[103] w-9 h-9 rounded-full flex items-center justify-center text-lg active:scale-95 transition-all"
        style={{
          background: 'rgba(255,255,255,0.10)',
          border: '1px solid rgba(255,255,255,0.20)',
          color: 'white',
          paddingTop: 'env(safe-area-inset-top, 0px)',
        }}>
        {muted ? '🔇' : '🔊'}
      </button>

      {/* Confetti canvas */}
      <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none" style={{ zIndex: 101 }} />

      {/* Content */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="relative z-[102] flex flex-col items-center px-6 w-full max-w-sm"
        style={{
          animation: 'slideUp 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
        onClick={e => e.stopPropagation()}>

        {/* Splity — canonical brand-coral running-shoe character */}
        <div style={{ animation: 'splityBounce 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s both' }}>
          <Splity mood={splityMood} size={96} />
        </div>

        {/* Splity reaction line — single line, ACWR-band gated.
            In-band: cite the figure. Out-of-band or missing: generic copy with
            no ACWR mention (coach-domain-expert R2 amendment). */}
        <p className="mt-2 text-xs text-center font-bold" style={{ color: 'rgba(255,255,255,0.7)' }}>
          {(typeof acwr === 'number' && acwr >= 0.8 && acwr <= 1.3)
            ? `Steady — ACWR ${acwr.toFixed(2)}, dialled in.`
            : 'Great work. Keep showing up.'}
        </p>

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

        {/* Squad-feed status — P1.1 wire-up, populated from
            shareSessionWithSquadAction. aria-live announces the result to SR
            users without retriggering the parent role="status" container. */}
        {feedCardIds === undefined && !feedError && (
          <div
            aria-live="polite"
            className="mt-3 w-full rounded-xl px-3 py-2 text-xs text-center"
            style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.5)' }}>
            Sharing with squad…
          </div>
        )}
        {feedCardIds && feedCardIds.length > 0 && (
          <div
            aria-live="polite"
            className="mt-3 w-full rounded-xl px-3 py-2.5 text-xs text-center font-bold"
            style={{
              background: 'rgba(34,197,94,0.12)',
              border: '1px solid rgba(34,197,94,0.3)',
              color: '#22c55e',
            }}>
            Posted to your squad{feedCardIds.length > 1 ? 's' : ''}&apos; feed
          </div>
        )}
        {feedError && (
          <div
            aria-live="polite"
            className="mt-3 w-full rounded-xl px-3 py-2.5 text-xs text-center"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.55)',
            }}>
            Your run is logged. Share it when you&apos;re ready.
          </div>
        )}

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
