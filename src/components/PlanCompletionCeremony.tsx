'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { UserPlan, TrainingLog } from '@/types/database'
import RaceResultShareCard from '@/components/RaceResultShareCard'

interface Props {
  plan: UserPlan
  logs: Record<string, TrainingLog>
  onClose: () => void
}

// ── Confetti particle ──────────────────────────────────────────────────────────
interface Particle {
  x: number; y: number; vx: number; vy: number
  color: string; size: number; rotation: number; rotSpeed: number; opacity: number
}

const COLORS = ['var(--ns-ember)','#34D399','#FCD34D','#F87171','#A78BFA','#60A5FA','#FB923C']

function useConfetti(canvasRef: React.RefObject<HTMLCanvasElement | null>, active: boolean) {
  const particles = useRef<Particle[]>([])
  const raf = useRef<number>(0)

  useEffect(() => {
    if (!active) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    // Spawn particles
    particles.current = Array.from({ length: 120 }, () => ({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * 100,
      vx: (Math.random() - 0.5) * 4,
      vy: 2 + Math.random() * 4,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: 6 + Math.random() * 8,
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 8,
      opacity: 1,
    }))

    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      particles.current = particles.current.filter(p => p.opacity > 0.05)
      for (const p of particles.current) {
        p.x += p.vx; p.y += p.vy
        p.vy += 0.08
        p.rotation += p.rotSpeed
        if (p.y > canvas.height * 0.7) p.opacity -= 0.02
        ctx.save()
        ctx.globalAlpha = p.opacity
        ctx.translate(p.x, p.y)
        ctx.rotate((p.rotation * Math.PI) / 180)
        ctx.fillStyle = p.color
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2)
        ctx.restore()
      }
      if (particles.current.length > 0) {
        raf.current = requestAnimationFrame(tick)
      }
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [active, canvasRef])
}

// ── Stats computation ──────────────────────────────────────────────────────────
function computeStats(logs: Record<string, TrainingLog>) {
  const all = Object.values(logs)
  const done = all.filter(l => l.done)
  const totalKm = done.reduce((s, l) => s + (l.km ?? 0), 0)
  const totalSessions = done.length
  const avgEffort = done.filter(l => l.effort != null).reduce((s, l, _, a) =>
    s + (l.effort ?? 0) / a.length, 0)
  return { totalKm, totalSessions, avgEffort: Math.round(avgEffort * 10) / 10 }
}

// ── Badge display ──────────────────────────────────────────────────────────────
const COMPLETION_BADGES = [
  { emoji: '🏅', label: 'Plan Finisher' },
  { emoji: '📅', label: 'Committed' },
  { emoji: '🚀', label: 'Going the Distance' },
]

export default function PlanCompletionCeremony({ plan, logs, onClose }: Props) {
  const router = useRouter()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [visible, setVisible] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const stats = computeStats(logs)

  // Delay entrance for dramatic effect
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80)
    // Mark plan as completed in localStorage so Today tab shows re-engagement prompt
    try { localStorage.setItem('nextsplit_plan_completed', '1') } catch {}
    return () => clearTimeout(t)
  }, [])

  useConfetti(canvasRef, visible)

  const planDurationWeeks = plan.total_weeks
  const completedAt = plan.completed_at
    ? new Date(plan.completed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'Today'

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center transition-opacity duration-500 ${visible ? 'opacity-100' : 'opacity-0'}`}
      style={{ background: 'linear-gradient(160deg, #0f172a 0%, var(--ns-forest) 60%, #065F46 100%)' }}
    >
      {/* Confetti canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center px-6 text-center max-w-sm w-full">

        {/* Trophy */}
        <div
          className={`text-8xl mb-4 transition-all duration-700 ${visible ? 'scale-100 translate-y-0' : 'scale-50 translate-y-8'}`}
          style={{ filter: 'drop-shadow(0 0 32px rgba(252,211,77,0.6))' }}
        >
          🏆
        </div>

        <h1 className="text-3xl font-black text-white mb-1">Plan Complete!</h1>
        <p className="text-orange-200 text-sm mb-6">{completedAt}</p>

        {/* Plan name */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-5 py-3 mb-6 w-full">
          <div className="text-white/60 text-xs uppercase tracking-wider mb-0.5">Plan finished</div>
          <div className="text-white font-bold text-base">{plan.name}</div>
          <div className="text-[var(--ns-forest-light)] text-xs">{planDurationWeeks} weeks · {plan.goal ?? 'Running'}</div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 w-full mb-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
            <div className="text-2xl font-black text-white">{stats.totalKm > 0 ? stats.totalKm.toFixed(0) : '—'}</div>
            <div className="text-orange-200 text-[10px] uppercase tracking-wide">km logged</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
            <div className="text-2xl font-black text-white">{stats.totalSessions}</div>
            <div className="text-orange-200 text-[10px] uppercase tracking-wide">sessions</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
            <div className="text-2xl font-black text-white">{stats.avgEffort > 0 ? stats.avgEffort : '—'}</div>
            <div className="text-orange-200 text-[10px] uppercase tracking-wide">avg effort</div>
          </div>
        </div>

        {/* Badges earned */}
        <div className="flex gap-3 mb-8">
          {COMPLETION_BADGES.map(b => (
            <div key={b.label} className="flex flex-col items-center gap-1">
              <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl">
                {b.emoji}
              </div>
              <div className="text-orange-200 text-[9px] text-center leading-tight max-w-[48px]">{b.label}</div>
            </div>
          ))}
        </div>

        {/* CTAs */}
        <button
          onClick={() => setShowShare(true)}
          className="w-full py-4 bg-white rounded-2xl text-base font-black mb-3 shadow-xl active:scale-95 transition-transform"
          style={{ color: 'var(--ns-ember)' }}
        >
          Share your achievement →
        </button>
        <button
          onClick={() => { router.push('/onboarding'); onClose() }}
          className="w-full py-3 bg-white/10 text-white rounded-2xl text-sm font-semibold mb-2 active:scale-95 transition-transform"
        >
          Start your next plan →
        </button>
        <button
          onClick={onClose}
          className="w-full py-3 text-white/50 text-sm font-medium"
        >
          Close
        </button>
      </div>

      {/* Race result share card */}
      {showShare && (
        <RaceResultShareCard
          planName={plan.name}
          totalWeeks={plan.total_weeks}
          raceDate={plan.race_date ?? undefined}
          totalKm={stats.totalKm}
          sessionsDone={stats.totalSessions}
          longestRun={Math.max(0, ...Object.values(logs).filter(l => l.done).map(l => l.km ?? 0))}
          displayName="Runner"
          onClose={() => setShowShare(false)}
        />
      )}
    </div>
  )
}
