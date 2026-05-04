'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import type { PlanWeek, PlanSession, TrainingLog } from '@/types/database'

// ── Types ──────────────────────────────────────────────────────────────────────

interface Props {
  weeks:        PlanWeek[]
  currentWeekN: number
  logs:         Record<string, TrainingLog>
  onWeekTap:    (week: PlanWeek) => void
  planName:     string
  raceDate:     string | null
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

function Wave({ x, y, width = 60 }: { x: number; y: number; width?: number }) {
  return (
    <g transform={`translate(${x},${y})`} opacity={0.5}>
      <path d={`M 0 0 Q ${width*0.25} -5 ${width*0.5} 0 Q ${width*0.75} 5 ${width} 0`}
        fill="none" stroke="#1e90d4" strokeWidth={2} />
      <path d={`M 5 8 Q ${width*0.3} 3 ${width*0.6} 8 Q ${width*0.8} 13 ${width-5} 8`}
        fill="none" stroke="#1e90d4" strokeWidth={1.5} />
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
  return (
    <g transform={`translate(${x},${y})`} opacity={0.7}>
      {/* Arch */}
      <path d="M -50 0 Q -50 -60 0 -60 Q 50 -60 50 0" fill="none" stroke="#8b5cf6" strokeWidth={4} />
      {/* Pillars */}
      <rect x={-52} y={-40} width={6} height={40} fill="#6b3fa0" />
      <rect x={46} y={-40} width={6} height={40} fill="#6b3fa0" />
      {/* Finish banner */}
      <rect x={-40} y={-55} width={80} height={8} rx={2} fill="#ec4899" opacity={0.9} />
      <text x={0} y={-48} textAnchor="middle" fontSize={5} fill="white" fontWeight="bold">FINISH</text>
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
      {/* Dense forest - trees on both sides */}
      {[0,1,2].map(i => (
        <Tree key={`l${i}`} x={5 + i * 18}  y={y} h={35 + r(i)*12} variant={1} />
      ))}
      {[0,1,2].map(i => (
        <Tree key={`r${i}`} x={295 + i * 18} y={y} h={35 + r(i+10)*12} variant={1} />
      ))}
      <Tree x={20 + r(20)*15} y={y + 15} h={28} variant={2} />
      <Tree x={310 + r(21)*10} y={y + 15} h={28} variant={2} />
      {/* Firefly dots */}
      {[0,1,2,3].map(i => (
        <circle key={i} cx={r(30+i) * width} cy={y - r(31+i) * 40} r={1.5}
          fill="#84cc16" opacity={0.4 + r(32+i) * 0.4} />
      ))}
    </g>
  )

  if (zone === 'coastal') return (
    <g>
      <Cliff x={10}  y={y + 10} w={45} h={55} />
      <Cliff x={270} y={y + 10} w={55} h={45} />
      <Wave  x={50 + r(1) * 80} y={y + 30} width={70} />
      <Wave  x={150 + r(2) * 60} y={y + 45} width={50} />
      <Cloud x={r(3) * width * 0.5 + 30}  y={y - 35} scale={0.8} />
      <Cloud x={r(4) * width * 0.3 + 180} y={y - 50} scale={0.6} />
      {/* Seagulls */}
      <Bird x={r(5) * width * 0.6 + 60}  y={y - 25} />
      <Bird x={r(6) * width * 0.4 + 160} y={y - 38} />
    </g>
  )

  // Stadium
  return (
    <g>
      <Stadium x={width / 2} y={y - 20} />
      <Crowd x={width * 0.25} y={y + 15} count={6} />
      <Crowd x={width * 0.65} y={y + 15} count={6} />
      {/* Lights */}
      <circle cx={40}  cy={y - 60} r={6} fill="#f0a500" opacity={0.7} />
      <circle cx={320} cy={y - 60} r={6} fill="#f0a500" opacity={0.7} />
      <line x1={40}  y1={y-60} x2={40}  y2={y+20} stroke="#555" strokeWidth={2} />
      <line x1={320} y1={y-60} x2={320} y2={y+20} stroke="#555" strokeWidth={2} />
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
  const W         = 360
  const perWeek   = 90
  const totalH    = 80 + weeks.length * perWeek + 160

  // Scroll to current week
  useEffect(() => {
    const el = document.getElementById(`week-node-${currentWeekN}`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [currentWeekN])

  const points = buildPath(weeks.length, W)

  // Compute zone transitions (gradient background bands)
  const zones = weeks.map((w, i) => getZone(i / Math.max(weeks.length - 1, 1)))

  // Build the track path (slightly wider — dual lines like a road)
  const pathStr = pointsToSVGPath(points)

  return (
    <div className="relative" style={{ width: '100%', overflowX: 'hidden' }}>
      <svg
        ref={svgRef}
        width="100%"
        viewBox={`0 0 ${W} ${totalH}`}
        style={{ display: 'block' }}
        preserveAspectRatio="xMidYMin meet"
      >
        <defs>
          {/* Sky gradients per zone */}
          {(['park','hills','forest','coastal','stadium'] as const).map(z => (
            <linearGradient key={z} id={`sky-${z}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={ZONE_SKY[z][0]} />
              <stop offset="100%" stopColor={ZONE_SKY[z][1]} />
            </linearGradient>
          ))}
          {/* Track gradient */}
          <linearGradient id="track-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3a3a4a" />
            <stop offset="100%" stopColor="#2a2a3a" />
          </linearGradient>
          {/* Glow filter */}
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          {/* Soft filter */}
          <filter id="soft">
            <feGaussianBlur stdDeviation="1.5" />
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

          {/* ── Scenery layers ── */}
          {weeks.map((w, i) => {
            const pt   = points[i] ?? { x: 0, y: 0 }
            const zone = getZone(i / Math.max(weeks.length - 1, 1))
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
          {/* Completed track highlight */}
          {currentWeekN > 1 && (() => {
            const completedPts = points.slice(0, currentWeekN)
            const completedPath = pointsToSVGPath(completedPts)
            return (
              <path d={completedPath} fill="none"
                stroke="#06b6d4" strokeWidth={4} opacity={0.5}
                strokeLinecap="round" strokeLinejoin="round"
                filter="url(#glow)" />
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
            const isActive = active === week.n
            const r        = isCurrent ? 20 : 15

            // Arc calculations
            const circumference = 2 * Math.PI * (r - 3)
            const arcDash = circumference * pct

            return (
              <g key={week.n} id={`week-node-${week.n}`}
                onClick={() => { setActive(week.n); onWeekTap(week) }}
                style={{ cursor: 'pointer' }}>

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

                {/* Pulsing ring for current */}
                {isCurrent && (
                  <circle cx={pt.x} cy={pt.y} r={r + 4} fill="none"
                    stroke={colour} strokeWidth={2} opacity={0.4}>
                    <animate attributeName="r" values={`${r+2};${r+10};${r+2}`} dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.4;0;0.4" dur="2s" repeatCount="indefinite" />
                  </circle>
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

          {/* ── Runner on current week ── */}
          {points[currentWeekN - 1] && (() => {
            const pt = points[currentWeekN - 1]
            return <RunnerIcon x={pt.x} y={pt.y - 32} colour="#06b6d4" />
          })()}

          {/* ── Start marker ── */}
          <g transform={`translate(${points[0]?.x ?? W/2}, 40)`}>
            <circle cx={0} cy={0} r={14} fill="#22c55e" opacity={0.9} />
            <text x={0} y={5} textAnchor="middle" fontSize={10}>🚀</text>
          </g>

          {/* ── Finish marker ── */}
          <g transform={`translate(${points[weeks.length - 1]?.x ?? W/2}, ${totalH - 60})`}>
            <circle cx={0} cy={0} r={18} fill="#ec4899" opacity={0.9} filter="url(#glow)" />
            <text x={0} y={6} textAnchor="middle" fontSize={13}>🏁</text>
            {raceDate && (
              <text x={0} y={28} textAnchor="middle" fontSize={6.5} fill="#ec4899" fontWeight="bold">
                {new Date(raceDate).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'2-digit' })}
              </text>
            )}
          </g>
        </g>
      </svg>
    </div>
  )
}
