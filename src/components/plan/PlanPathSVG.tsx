'use client'

import { useRef, useEffect, useState } from 'react'
import type { PlanWeek, TrainingLog } from '@/types/database'

// ── Types ──────────────────────────────────────────────────────────────────────

interface Props {
  weeks:        PlanWeek[]
  currentWeekN: number
  logs:         Record<string, TrainingLog>
  onWeekTap:    (week: PlanWeek) => void
  planName:     string
  raceDate:     string | null
}

// ── Reduced-motion detection ──────────────────────────────────────────────────
// Lazy initialiser reads matchMedia synchronously on the client during the
// first render, eliminating the hydration flash that briefly played motion
// for users with prefers-reduced-motion before the useEffect ran (council
// /council R2 frontend-engineer LIVE BUG — PlanPathSVG.tsx hydration flash).
// SSR-safe: typeof window guarded.
function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return reduced
}

// ── Environment zones based on week position ──────────────────────────────────

function getZone(pct: number): 'park' | 'hills' | 'forest' | 'coastal' | 'stadium' {
  if (pct < 0.2)  return 'park'
  if (pct < 0.45) return 'hills'
  if (pct < 0.65) return 'forest'
  if (pct < 0.85) return 'coastal'
  return 'stadium'
}

const ZONE_SKY: Record<string, [string, string]> = {
  park:    ['#1a2744', '#0d1a2e'],
  hills:   ['#1a2033', '#0f1520'],
  forest:  ['#0d1a0d', '#060e06'],
  coastal: ['#0d1a2a', '#061015'],
  stadium: ['#1a0d2a', '#0d0615'],
}

// ── SVG helpers ───────────────────────────────────────────────────────────────

function getSessionColour(code: string | undefined | null): string {
  if (!code) return '#22c55e'
  const c = code.toLowerCase()
  if (c.includes('tempo'))                           return '#eab308'
  if (c.includes('interval') || c.includes('speed')) return '#f97316'
  if (c.includes('long'))                            return '#3b82f6'
  if (c.includes('recovery'))                        return '#4ade80'
  if (c.includes('gym') || c.includes('strength'))   return '#8b5cf6'
  if (c.includes('race'))                            return '#ec4899'
  return '#22c55e'
}

const WEEK_COLOURS: Record<string, string> = {
  k: '#2563eb', d: '#f97316', p: '#ef4444', r: '#ec4899',
}
function getWeekColour(b: string) { return WEEK_COLOURS[b] ?? '#2563eb' }

function getWeekDone(week: PlanWeek, logs: Record<string, TrainingLog>): number {
  let done = 0
  week.days.forEach((day, di) => {
    ;(day.sessions ?? []).forEach((_, si) => {
      if (logs[`${week.n}_${di}_${si}`]?.done) done++
    })
  })
  return done
}

function getWeekTotal(week: PlanWeek): number {
  return week.days.reduce((s, d) => s + (d.sessions?.filter(s => s.c && s.c !== 'rest').length ?? 0), 0)
}

// ── Path geometry ─────────────────────────────────────────────────────────────
// Winding S-curve path down the canvas
// Width: 360, each week gets ~80px of vertical space

function buildPath(count: number, width: number): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = []
  const margin   = 60
  const usable   = width - margin * 2
  const ySpacing = 90

  for (let i = 0; i <= count; i++) {
    const t    = i / Math.max(count, 1)
    // S-curve: oscillates between left and right
    const wave = Math.sin(t * Math.PI * 2.5) * 0.4 + 0.5
    const x    = margin + wave * usable
    const y    = 80 + i * ySpacing
    points.push({ x, y })
  }
  return points
}

function pointsToSVGPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return ''
  let d = `M ${pts[0].x} ${pts[0].y}`
  for (let i = 1; i < pts.length; i++) {
    const p  = pts[i - 1]
    const c  = pts[i]
    const mx = (p.x + c.x) / 2
    const my = (p.y + c.y) / 2
    d += ` Q ${p.x} ${p.y} ${mx} ${my}`
  }
  const last = pts[pts.length - 1]
  d += ` L ${last.x} ${last.y}`
  return d
}

// ── Scenery elements ──────────────────────────────────────────────────────────

function Tree({ x, y, h = 28, variant = 0 }: { x: number; y: number; h?: number; variant?: number }) {
  if (variant === 1) {
    // Pine
    return (
      <g transform={`translate(${x},${y})`} opacity={0.7}>
        <rect x={-2} y={0} width={4} height={h * 0.4} fill="#4a2e0a" />
        <polygon points={`0,${-h} ${-h*0.4},${h*0.1} ${h*0.4},${h*0.1}`} fill="#1a4a1a" />
        <polygon points={`0,${-h*0.75} ${-h*0.5},${h*0.2} ${h*0.5},${h*0.2}`} fill="#1f5a1f" />
      </g>
    )
  }
  if (variant === 2) {
    // Dead/winter tree
    return (
      <g transform={`translate(${x},${y})`} opacity={0.5}>
        <rect x={-2} y={-h} width={4} height={h} fill="#3a2a1a" />
        <line x1={0} y1={-h*0.7} x2={-h*0.4} y2={-h*1.1} stroke="#3a2a1a" strokeWidth={2} />
        <line x1={0} y1={-h*0.5} x2={h*0.35} y2={-h*0.9} stroke="#3a2a1a" strokeWidth={1.5} />
      </g>
    )
  }
  // Default round tree
  return (
    <g transform={`translate(${x},${y})`} opacity={0.75}>
      <rect x={-2} y={-h*0.3} width={4} height={h*0.4} fill="#4a2e0a" />
      <circle cx={0} cy={-h*0.5} r={h*0.45} fill="#1a5c1a" />
      <circle cx={-h*0.15} cy={-h*0.6} r={h*0.3} fill="#1f6b1f" />
    </g>
  )
}

function Hill({ x, y, w = 120, h = 50, colour = '#1a3a1a' }: { x: number; y: number; w?: number; h?: number; colour?: string }) {
  return (
    <ellipse cx={x} cy={y} rx={w/2} ry={h/2} fill={colour} opacity={0.6} />
  )
}

function Cloud({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  const s = scale * 0.5
  return (
    <g transform={`translate(${x},${y})`} opacity={0.12}>
      <ellipse cx={0} cy={0} rx={25*s} ry={12*s} fill="white" />
      <ellipse cx={-12*s} cy={-5*s} rx={16*s} ry={10*s} fill="white" />
      <ellipse cx={12*s} cy={-4*s} rx={18*s} ry={11*s} fill="white" />
    </g>
  )
}

function Cliff({ x, y, w = 50, h = 60 }: { x: number; y: number; w?: number; h?: number }) {
  return (
    <g transform={`translate(${x},${y})`} opacity={0.65}>
      <polygon points={`0,0 ${w},0 ${w*0.8},${-h} ${w*0.2},${-h}`} fill="#3a3a4a" />
      <polygon points={`${w*0.2},${-h} ${w*0.8},${-h} ${w*0.6},${-h*1.3} ${w*0.4},${-h*1.3}`} fill="#4a4a5a" />
    </g>
  )
}

function Star({ x, y }: { x: number; y: number }) {
  return <circle cx={x} cy={y} r={0.8} fill="white" opacity={0.6} />
}

function Crowd({ x, y, count = 8 }: { x: number; y: number; count?: number }) {
  const colours = ['#ff4d6d', '#06b6d4', '#84cc16', '#f0a500', '#8b5cf6']
  return (
    <g transform={`translate(${x},${y})`} opacity={0.7}>
      {Array.from({ length: count }).map((_, i) => (
        <g key={i} transform={`translate(${i * 9 - count * 4.5},0)`}>
          <circle cx={0} cy={-14} r={4} fill={colours[i % colours.length]} />
          <rect x={-3} y={-10} width={6} height={10} rx={2} fill={colours[i % colours.length]} opacity={0.8} />
        </g>
      ))}
    </g>
  )
}

function Stadium({ x, y }: { x: number; y: number }) {
  // Single composed centrepiece — frames the finish flag rendered separately at the same x.
  // No "FINISH" banner here; the lone ember finish flag is the finish signal.
  return (
    <g transform={`translate(${x},${y})`} opacity={0.85}>
      {/* Arch */}
      <path d="M -55 0 Q -55 -65 0 -65 Q 55 -65 55 0" fill="none"
        stroke="var(--ns-violet, #a855f7)" strokeWidth={4} strokeLinecap="round" />
      {/* Pillars */}
      <rect x={-58} y={-45} width={6} height={45} rx={1} fill="var(--ns-violet, #a855f7)" opacity={0.55} />
      <rect x={52}  y={-45} width={6} height={45} rx={1} fill="var(--ns-violet, #a855f7)" opacity={0.55} />
    </g>
  )
}

function Bird({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x},${y})`} opacity={0.5}>
      <path d="M -6 0 Q -3 -4 0 0 Q 3 -4 6 0" fill="none" stroke="white" strokeWidth={1.2} />
    </g>
  )
}

// ── Runner icon ───────────────────────────────────────────────────────────────

function RunnerIcon({ x, y, colour }: { x: number; y: number; colour: string }) {
  return (
    <g transform={`translate(${x},${y})`}>
      {/* Glow */}
      <circle cx={0} cy={0} r={16} fill={colour} opacity={0.2} />
      <circle cx={0} cy={0} r={12} fill={colour} opacity={0.3} />
      {/* Body */}
      <circle cx={0} cy={-8} r={5} fill={colour} />
      <line x1={0} y1={-3} x2={0} y2={5} stroke={colour} strokeWidth={3} strokeLinecap="round" />
      <line x1={0} y1={-1} x2={-6} y2={3} stroke={colour} strokeWidth={2} strokeLinecap="round" />
      <line x1={0} y1={-1} x2={6} y2={2} stroke={colour} strokeWidth={2} strokeLinecap="round" />
      <line x1={0} y1={5} x2={-5} y2={11} stroke={colour} strokeWidth={2.5} strokeLinecap="round" />
      <line x1={0} y1={5} x2={5} y2={11} stroke={colour} strokeWidth={2.5} strokeLinecap="round" />
    </g>
  )
}

// ── Scenery layout for a zone ─────────────────────────────────────────────────

function SceneryLayer({
  zone, y, width, seed,
}: {
  zone: 'park' | 'hills' | 'forest' | 'coastal' | 'stadium'
  y: number
  width: number
  seed: number
}) {
  const r = (n: number) => ((seed * 9301 + n * 49297) % 233280) / 233280

  if (zone === 'park') return (
    <g>
      <Cloud x={r(1) * width} y={y - 30} scale={1 + r(2)} />
      <Cloud x={r(3) * width} y={y - 50} scale={0.7 + r(4)} />
      <Tree x={r(5) * 60 + 10}    y={y} h={30 + r(6) * 15} variant={0} />
      <Tree x={r(7) * 60 + 280}   y={y} h={25 + r(8) * 15} variant={0} />
      <Tree x={r(9) * 40 + 20}    y={y + 20} h={20 + r(10) * 10} variant={0} />
      <Tree x={r(11) * 40 + 300}  y={y + 20} h={20 + r(12) * 10} variant={1} />
    </g>
  )

  if (zone === 'hills') return (
    <g>
      <Hill x={r(1) * width * 0.4 + 20}  y={y + 10} w={160 + r(2)*60} h={60 + r(3)*30} colour="#1a3020" />
      <Hill x={r(4) * width * 0.3 + 180} y={y + 5}  w={140 + r(5)*40} h={50 + r(6)*25} colour="#162815" />
      <Bird x={r(7) * width * 0.6 + 50}  y={y - 40} />
      <Bird x={r(8) * width * 0.4 + 150} y={y - 55} />
      <Tree x={30 + r(9) * 20}  y={y - 20} h={25} variant={1} />
      <Tree x={290 + r(10) * 20} y={y - 15} h={20} variant={1} />
    </g>
  )

  if (zone === 'forest') return (
    <g>
      {/* Foreground trees — left then right; rendered after midground scenery in main loop.
          Density capped at 2 per side per week (was 3) to prevent stacking compounding into a wall. */}
      {[0,1].map(i => (
        <Tree key={`l${i}`} x={8 + i * 22}  y={y} h={35 + r(i)*12} variant={1} />
      ))}
      {[0,1].map(i => (
        <Tree key={`r${i}`} x={300 + i * 22} y={y} h={35 + r(i+10)*12} variant={1} />
      ))}
      {/* Firefly dots */}
      {[0,1,2,3].map(i => (
        <circle key={i} cx={r(30+i) * width} cy={y - r(31+i) * 40} r={1.5}
          fill="var(--ns-lime, #7fff4d)" opacity={0.4 + r(32+i) * 0.4} />
      ))}
    </g>
  )

  if (zone === 'coastal') return (
    <g>
      {/* Cliffs only — water surface is rendered once as a backdrop band, not per week. */}
      <Cliff x={10}  y={y + 10} w={45} h={55} />
      <Cliff x={270} y={y + 10} w={55} h={45} />
      <Cloud x={r(3) * width * 0.5 + 30}  y={y - 35} scale={0.8} />
      <Cloud x={r(4) * width * 0.3 + 180} y={y - 50} scale={0.6} />
      {/* Seagulls */}
      <Bird x={r(5) * width * 0.6 + 60}  y={y - 25} />
      <Bird x={r(6) * width * 0.4 + 160} y={y - 38} />
    </g>
  )

  // Stadium zone — per-week elements only (lights, crowd flecks).
  // The single Stadium arch is rendered once in the main canvas, not per week.
  return (
    <g>
      <Crowd x={width * 0.22} y={y + 15} count={5} />
      <Crowd x={width * 0.68} y={y + 15} count={5} />
      <circle cx={40}  cy={y - 60} r={5} fill="var(--ns-amber, #ffb800)" opacity={0.6} />
      <circle cx={320} cy={y - 60} r={5} fill="var(--ns-amber, #ffb800)" opacity={0.6} />
    </g>
  )
}

// ── Stars background ──────────────────────────────────────────────────────────

function StarsBackground({ width, height }: { width: number; height: number }) {
  const stars = Array.from({ length: 60 }, (_, i) => ({
    x: ((i * 7919) % width),
    y: ((i * 6271) % height),
    r: i % 5 === 0 ? 1.2 : 0.7,
    opacity: 0.2 + (i % 7) * 0.05,
  }))
  return (
    <g>
      {stars.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="white" opacity={s.opacity} />
      ))}
    </g>
  )
}

// ── Main PlanPathSVG ──────────────────────────────────────────────────────────

export default function PlanPathSVG({ weeks, currentWeekN, logs, onWeekTap, planName, raceDate }: Props) {
  const svgRef    = useRef<SVGSVGElement>(null)
  const [active, setActive] = useState<number | null>(null)
  const reducedMotion = useReducedMotion()

  // Scroll to current week
  useEffect(() => {
    if (!weeks?.length) return
    const el = document.getElementById(`week-node-${currentWeekN}`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [currentWeekN, weeks?.length])

  // QA edge guard — empty/loading state. Placed AFTER all hooks to keep call
  // order stable across the empty→loaded transition.
  if (!weeks?.length) return null

  const W         = 360
  const perWeek   = 90
  const totalH    = 80 + weeks.length * perWeek + 160
  const points = buildPath(weeks.length, W)
  const lastIdx = weeks.length - 1
  const lastPt = points[lastIdx]

  // Compute zone membership and y-bounds from weeks actually present (not the
  // fixed 5-zone array — a 6-week plan may have no coastal zone at all).
  const zones = weeks.map((_, i) => getZone(i / Math.max(weeks.length - 1, 1)))
  const zoneRange = (zone: typeof zones[number]) => {
    const idxs = zones.map((z, i) => z === zone ? i : -1).filter(i => i >= 0)
    if (idxs.length === 0) return null
    const yStart = points[idxs[0]]?.y ?? 0
    const yEnd   = points[idxs[idxs.length - 1]]?.y ?? yStart
    return { yStart, yEnd }
  }
  const coastalRange = zoneRange('coastal')

  // Build the track path
  const pathStr = pointsToSVGPath(points)

  // Finish-moment composition: arch + flag share the final week node's x,
  // positioned just below the last node so they read as one finish.
  const finishX = lastPt?.x ?? W / 2
  const finishY = (lastPt?.y ?? 0) + 80

  return (
    <div className="relative" style={{
      width: '100%',
      overflowX: 'hidden',
      minHeight: '100dvh',
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    }}>
      <svg
        ref={svgRef}
        role="img"
        aria-labelledby="planpath-title planpath-desc"
        width="100%"
        viewBox={`0 0 ${W} ${totalH}`}
        style={{ display: 'block', touchAction: 'manipulation' }}
        preserveAspectRatio="xMidYMin meet"
      >
        <title id="planpath-title">{planName} — training plan path</title>
        <desc id="planpath-desc">
          {`A scrollable visual path of ${weeks.length} weeks. Currently on week ${currentWeekN} of ${weeks.length}.`}
          {raceDate ? ` Race day: ${new Date(raceDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}.` : ''}
        </desc>
        <defs>
          {/* Sky gradients per zone */}
          {(['park','hills','forest','coastal','stadium'] as const).map(z => (
            <linearGradient key={z} id={`sky-${z}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={ZONE_SKY[z][0]} />
              <stop offset="100%" stopColor={ZONE_SKY[z][1]} />
            </linearGradient>
          ))}
          {/* Water surface pattern — replaces per-week wave glyphs.
              Tiles a soft horizontal ripple. Uses --ns-cobalt brand colour. */}
          <pattern id="water-pattern" x="0" y="0" width="60" height="14" patternUnits="userSpaceOnUse">
            <path d="M 0 7 Q 15 2 30 7 T 60 7" fill="none"
              stroke="var(--ns-cobalt, #4d8aff)" strokeWidth="1.2" opacity="0.55" />
            <path d="M -5 11 Q 12 7 25 11 T 55 11" fill="none"
              stroke="var(--ns-cobalt, #4d8aff)" strokeWidth="0.8" opacity="0.35" />
          </pattern>
          {/* Glow filter */}
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          {/* Clip path */}
          <clipPath id="svg-clip">
            <rect width={W} height={totalH} />
          </clipPath>
        </defs>

        <g clipPath="url(#svg-clip)">
          {/* ── Background ── */}
          <rect width={W} height={totalH} fill={ZONE_SKY.park[1]} />
          <StarsBackground width={W} height={totalH} />

          {/* Zone bands */}
          {(['park','hills','forest','coastal','stadium'] as const).map((zone, zi) => {
            const zoneStart = (zi / 5) * totalH
            const zoneEnd   = ((zi + 1) / 5) * totalH
            return (
              <rect key={zone}
                x={0} y={zoneStart} width={W} height={zoneEnd - zoneStart}
                fill={`url(#sky-${zone})`} opacity={0.6} />
            )
          })}

          {/* ── Once-per-zone backdrop centrepieces ── */}
          {/* Single water surface for the full coastal range — replaces N stacked Wave glyphs */}
          {coastalRange && (
            <rect x={0} y={coastalRange.yStart - 30} width={W}
              height={coastalRange.yEnd - coastalRange.yStart + 80}
              fill="url(#water-pattern)" opacity={0.85} />
          )}

          {/* ── Per-week scenery layers ── */}
          {weeks.map((w, i) => {
            const pt   = points[i] ?? { x: 0, y: 0 }
            const zone = zones[i]
            return (
              <SceneryLayer key={i} zone={zone} y={pt.y} width={W} seed={i * 7 + 3} />
            )
          })}

          {/* ── Track (road surface) ── */}
          {/* Shadow / thick base */}
          <path d={pathStr} fill="none" stroke="#1a1a2a" strokeWidth={18}
            strokeLinecap="round" strokeLinejoin="round" opacity={0.8} />
          {/* Road surface */}
          <path d={pathStr} fill="none" stroke="#2a2a3a" strokeWidth={14}
            strokeLinecap="round" strokeLinejoin="round" />
          {/* Centre dashes */}
          <path d={pathStr} fill="none" stroke="#f0a50030" strokeWidth={2}
            strokeLinecap="round" strokeLinejoin="round"
            strokeDasharray="12 18" />
          {/* Completed track highlight + animateMotion path (P3.11).
              The path is given a stable id so the runner can trace it on
              first mount via <animateMotion><mpath> below. Reduced-motion
              users skip the entrance — the runner just appears at the
              current-week position. */}
          {currentWeekN > 1 && (() => {
            const completedPts = points.slice(0, currentWeekN)
            const completedPath = pointsToSVGPath(completedPts)
            return (
              <>
                <path id="ns-runner-path" d={completedPath} fill="none"
                  stroke="#06b6d4" strokeWidth={4} opacity={0.5}
                  strokeLinecap="round" strokeLinejoin="round"
                  filter="url(#glow)" />
              </>
            )
          })()}

          {/* ── Week nodes ── */}
          {weeks.map((week, i) => {
            const pt       = points[i] ?? { x: W/2, y: 80 + i * perWeek }
            const colour   = getWeekColour(week.b ?? 'k')
            const done     = getWeekDone(week, logs)
            const total    = getWeekTotal(week)
            const pct      = total > 0 ? done / total : 0
            const isPast   = week.n < currentWeekN
            const isCurrent = week.n === currentWeekN
            const r        = isCurrent ? 20 : 15

            // Arc calculations
            const circumference = 2 * Math.PI * (r - 3)
            const arcDash = circumference * pct

            return (
              <g key={week.n} id={`week-node-${week.n}`}
                onClick={() => { setActive(week.n); onWeekTap(week) }}
                role="button"
                aria-label={`Week ${week.n}${week.title ? `: ${week.title}` : ''}, ${done} of ${total} sessions complete${isCurrent ? ' (current)' : isPast ? ' (past)' : ''}`}
                style={{ cursor: 'pointer', touchAction: 'manipulation' }}>

                {/* Invisible 44×44 hit-rect for thumb-zone tap target (Mobile + a11y).
                    Sits beneath the visual node so tap area is always large enough,
                    even when the visual node is r=15 (30×30 visual). */}
                <rect x={pt.x - 22} y={pt.y - 22} width={44} height={44}
                  fill="transparent" pointerEvents="all" />

                {/* Node glow for current */}
                {isCurrent && (
                  <>
                    <circle cx={pt.x} cy={pt.y} r={r + 10} fill={colour} opacity={0.08} />
                    <circle cx={pt.x} cy={pt.y} r={r + 6}  fill={colour} opacity={0.12} />
                  </>
                )}

                {/* Progress arc background */}
                <circle cx={pt.x} cy={pt.y} r={r - 3} fill="none"
                  stroke="rgba(255,255,255,0.08)" strokeWidth={3} />

                {/* Progress arc fill */}
                {pct > 0 && (
                  <circle cx={pt.x} cy={pt.y} r={r - 3} fill="none"
                    stroke={colour} strokeWidth={3}
                    strokeLinecap="round"
                    strokeDasharray={`${arcDash} ${circumference}`}
                    style={{ transform: `rotate(-90deg)`, transformOrigin: `${pt.x}px ${pt.y}px` }} />
                )}

                {/* Node circle */}
                <circle cx={pt.x} cy={pt.y} r={r}
                  fill={isCurrent ? colour : isPast ? `${colour}30` : '#1a1a2a'}
                  stroke={isCurrent ? colour : isPast ? `${colour}80` : 'rgba(255,255,255,0.15)'}
                  strokeWidth={isCurrent ? 0 : 2} />

                {/* Node content */}
                {week.b === 'r' ? (
                  <text x={pt.x} y={pt.y + 5} textAnchor="middle" fontSize={isCurrent ? 14 : 11}>🏁</text>
                ) : isPast && done === total && total > 0 ? (
                  <text x={pt.x} y={pt.y + 4} textAnchor="middle" fontSize={isCurrent ? 13 : 10}
                    fill={isCurrent ? 'white' : colour}>✓</text>
                ) : (
                  <text x={pt.x} y={pt.y + (isCurrent ? 5 : 4)} textAnchor="middle"
                    fontSize={isCurrent ? 11 : 9} fontWeight="bold"
                    fill={isCurrent ? 'white' : isPast ? colour : 'rgba(255,255,255,0.3)'}>
                    {week.n}
                  </text>
                )}

                {/* Pulsing ring for current — gated behind prefers-reduced-motion (WCAG 2.3.3) */}
                {isCurrent && (
                  reducedMotion ? (
                    <circle cx={pt.x} cy={pt.y} r={r + 4} fill="none"
                      stroke={colour} strokeWidth={2} opacity={0.4} />
                  ) : (
                    <circle cx={pt.x} cy={pt.y} r={r + 4} fill="none"
                      stroke={colour} strokeWidth={2} opacity={0.4}>
                      <animate attributeName="r" values={`${r+2};${r+10};${r+2}`} dur="2s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.4;0;0.4" dur="2s" repeatCount="indefinite" />
                    </circle>
                  )
                )}

                {/* Week label card on alternating sides */}
                {(() => {
                  const isLeft   = i % 2 === 0
                  const cardX    = isLeft ? pt.x + r + 8 : pt.x - r - 8
                  const anchor   = isLeft ? 'start' : 'end'
                  const sessions = week.days.flatMap(d => d.sessions ?? [])
                    .filter(s => s.c && s.c !== 'rest')
                    .slice(0, 4)
                  const km = sessions.reduce((s, sess) => s + (sess.km ?? 0), 0)
                  const opacity = isCurrent ? 1 : isPast ? 0.6 : 0.35

                  return (
                    <g opacity={opacity}>
                      {/* Week title */}
                      <text x={cardX} y={pt.y - 6} textAnchor={anchor}
                        fontSize={7} fontWeight="bold"
                        fill={isCurrent ? 'white' : isPast ? '#cccccc' : '#666'}>
                        {week.title ? week.title.slice(0, 20) : `Week ${week.n}`}
                      </text>
                      {/* km */}
                      {km > 0 && (
                        <text x={cardX} y={pt.y + 4} textAnchor={anchor}
                          fontSize={6} fill={isCurrent ? getWeekColour(week.b ?? 'k') : '#888'}>
                          {km}km
                        </text>
                      )}
                      {/* Session dots */}
                      <g transform={`translate(${isLeft ? cardX : cardX - sessions.length * 9}, ${pt.y + 10})`}>
                        {sessions.map((s, si) => (
                          <circle key={si} cx={si * 9} cy={0} r={3}
                            fill={isCurrent || isPast ? getSessionColour(s.c) : '#444'} />
                        ))}
                      </g>
                    </g>
                  )
                })()}
              </g>
            )
          })}

          {/* ── Runner on current week ──
              P3.11: on first mount, the runner traces the completed path
              from start to current week (1.4s, ease-out, fill=freeze).
              After that one-shot entrance, it stays parked at the current
              week marker. Reduced-motion users see only the parked state. */}
          {points[currentWeekN - 1] && (() => {
            const pt = points[currentWeekN - 1]
            const showTrace = currentWeekN > 1 && !reducedMotion
            return (
              <g>
                {showTrace ? (
                  <g>
                    <RunnerIcon x={0} y={-32} colour="var(--ns-cobalt, #4d8aff)" />
                    <animateMotion dur="1.4s" begin="0.2s" fill="freeze"
                      calcMode="spline" keySplines="0.25 0.1 0.25 1">
                      <mpath href="#ns-runner-path" />
                    </animateMotion>
                  </g>
                ) : (
                  <RunnerIcon x={pt.x} y={pt.y - 32} colour="var(--ns-cobalt, #4d8aff)" />
                )}
              </g>
            )
          })()}

          {/* P3.11 Periodisation glyphs — small indicators at week-node
              positions for deload weeks (kmReduction ≥ 20% week-on-week)
              and the race week (final week if raceDate is set). */}
          {(() => {
            const glyphs: Array<{ week: number; x: number; y: number; type: 'deload' | 'race' }> = []
            for (let i = 0; i < weeks.length; i++) {
              const pt = points[i]
              if (!pt) continue
              const wn = weeks[i].n
              // Race glyph — final week if raceDate is set.
              if (raceDate && i === weeks.length - 1) {
                glyphs.push({ week: wn, x: pt.x, y: pt.y, type: 'race' })
                continue
              }
              // Deload glyph — week's km is ≥20% lower than previous week's km.
              if (i > 0) {
                const wkKm = (weeks[i].days ?? []).reduce((s, d) =>
                  s + (d.sessions ?? []).reduce((s2, ss) => s2 + (ss.km ?? 0), 0), 0)
                const prevKm = (weeks[i-1].days ?? []).reduce((s, d) =>
                  s + (d.sessions ?? []).reduce((s2, ss) => s2 + (ss.km ?? 0), 0), 0)
                if (prevKm > 0 && wkKm <= prevKm * 0.8) {
                  glyphs.push({ week: wn, x: pt.x, y: pt.y, type: 'deload' })
                }
              }
            }
            return glyphs.map(g => (
              <g key={`glyph-${g.week}-${g.type}`}
                transform={`translate(${g.x},${g.y - 18})`}
                aria-label={g.type === 'race' ? `Race week ${g.week}` : `Deload week ${g.week}`}>
                {g.type === 'race' ? (
                  <>
                    <circle cx={0} cy={0} r={6} fill="var(--ns-magenta, #ff2d9e)" opacity={0.85} />
                    <text x={0} y={3} textAnchor="middle" fontSize={8} fill="white">🏁</text>
                  </>
                ) : (
                  <>
                    <circle cx={0} cy={0} r={5} fill="var(--ns-forest, #00e676)" opacity={0.65} />
                    <text x={0} y={3} textAnchor="middle" fontSize={7}>🌿</text>
                  </>
                )}
              </g>
            ))
          })()}

          {/* ── Start marker ── */}
          <g transform={`translate(${points[0]?.x ?? W/2}, 40)`}>
            <circle cx={0} cy={0} r={14} fill="var(--ns-forest, #00e676)" opacity={0.9} />
            <text x={0} y={5} textAnchor="middle" fontSize={10}>🚀</text>
          </g>

          {/* ── Finish moment — single composed arch + flag ──
              UX/Visual recommendation: nest the ember finish flag at the same x as
              the violet Stadium arch so the arch frames the flag as ONE finish, not two
              competing markers. The arch is rendered only when the final week is in
              the stadium zone (true for all but very short plans). */}
          {zones[lastIdx] === 'stadium' && lastPt && (
            <Stadium x={finishX} y={finishY} />
          )}
          <g transform={`translate(${finishX}, ${finishY})`}>
            <circle cx={0} cy={0} r={18} fill="var(--ns-ember, #ff3d6e)" opacity={0.95} filter="url(#glow)" />
            <text x={0} y={6} textAnchor="middle" fontSize={13}>🏁</text>
            {raceDate && (
              <text x={0} y={32} textAnchor="middle" fontSize={6.5}
                fill="var(--ns-ember, #ff3d6e)" fontWeight="bold">
                {new Date(raceDate).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'2-digit' })}
              </text>
            )}
          </g>
        </g>
      </svg>
    </div>
  )
}
