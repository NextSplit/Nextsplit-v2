/**
 * Splity — NextSplit's mascot. An animated running shoe with personality.
 * Designed to match Duolingo's Duo — appears in celebrations, warnings,
 * empty states, and the Home header.
 *
 * Moods: idle | happy | excited | worried | celebrating | running | sleepy
 */

'use client'

import { useEffect, useState } from 'react'

export type SplityMood = 'idle' | 'happy' | 'excited' | 'worried' | 'celebrating' | 'running' | 'sleepy'

interface Props {
  size?:      number
  mood?:      SplityMood
  animate?:   boolean   // enables idle bounce animation
  className?: string
  label?:     string    // speech bubble text
}

// Eye shapes per mood
const EYES: Record<SplityMood, { left: string; right: string; shine?: boolean }> = {
  idle:        { left: 'circle', right: 'circle', shine: true },
  happy:       { left: 'squint', right: 'squint', shine: true },
  excited:     { left: 'wide',   right: 'wide',   shine: true },
  worried:     { left: 'circle', right: 'circle', shine: false },
  celebrating: { left: 'star',   right: 'star',   shine: true },
  running:     { left: 'circle', right: 'squint',  shine: true },
  sleepy:      { left: 'half',   right: 'half',   shine: false },
}

// Mouth paths per mood
const MOUTHS: Record<SplityMood, string> = {
  idle:        'M 13 23 Q 18 26 23 23',      // gentle smile
  happy:       'M 11 22 Q 18 28 25 22',      // big smile
  excited:     'M 11 21 Q 18 29 25 21',      // huge open smile
  worried:     'M 13 25 Q 18 22 23 25',      // frown
  celebrating: 'M 11 22 Q 18 29 25 22',      // big smile
  running:     'M 13 22 Q 18 25 23 22',      // determined
  sleepy:      'M 13 24 Q 18 26 23 24',      // flat sleepy
}

// Eyebrow paths per mood (worried/running only)
const BROWS: Partial<Record<SplityMood, string>> = {
  worried:     'M 11 16 Q 14 14 17 16 M 19 16 Q 22 14 25 16',
  running:     'M 11 17 Q 14 15 17 17 M 19 15 Q 22 17 25 15',
  excited:     'M 12 16 Q 15 14 18 16 M 18 16 Q 21 14 24 16',
}

function Eye({ cx, cy, type, size = 3 }: {
  cx: number; cy: number
  type: 'circle' | 'squint' | 'wide' | 'star' | 'half'
  size?: number
}) {
  if ((type as string) === 'squint') {
    return <path d={`M ${cx-size} ${cy} Q ${cx} ${cy-size} ${cx+size} ${cy}`}
      stroke="#1a1a2e" strokeWidth={2.5} strokeLinecap="round" fill="none" />
  }
  if ((type as string) === 'star') {
    return <text x={cx-size} y={cy+size} fontSize={size*2.5} textAnchor="middle">⭐</text>
  }
  if ((type as string) === 'half') {
    return <>
      <path d={`M ${cx-size} ${cy} A ${size} ${size} 0 0 1 ${cx+size} ${cy}`}
        fill="#1a1a2e" />
      <path d={`M ${cx-size-1} ${cy} L ${cx+size+1} ${cy}`}
        stroke="#1a1a2e" strokeWidth={1} />
    </>
  }
  const r = type === 'wide' ? size * 1.3 : size
  return <circle cx={cx} cy={cy} r={r} fill="#1a1a2e" />
}

export default function Splity({
  size = 64, mood = 'idle', animate = true, className = '', label,
}: Props) {
  const [bounce, setBounce] = useState(0)
  const eyes = EYES[mood]

  // Idle animation — gentle bob (skipped under prefers-reduced-motion, WCAG 2.3.3)
  useEffect(() => {
    if (!animate) return
    if (typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return
    }
    let frame = 0
    const id = setInterval(() => {
      frame++
      setBounce(Math.sin(frame * 0.08) * 2)
    }, 16)
    return () => clearInterval(id)
  }, [animate])

  const s = size / 36   // scale factor (base viewBox is 36×36)
  const translateY = bounce

  // Shoe colour scheme
  const BODY_TOP  = '#ff3d6e'    // ember — coral upper
  const BODY_SOLE = '#c41a4a'    // darker sole
  const LACE      = '#ffffff'
  const TONGUE    = '#ff6b94'
  const DETAIL    = '#ff1a55'

  return (
    <div className={`relative inline-flex flex-col items-center ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ transform: `translateY(${translateY}px)`, transition: 'transform 0.05s linear' }}
        role="img"
        aria-label={`Splity — ${mood}`}
      >
        {/* ── Shadow ── */}
        <ellipse cx={18} cy={34} rx={10} ry={2}
          fill="rgba(0,0,0,0.25)"
          style={{ transform: `scaleX(${1 + Math.abs(bounce) * 0.05})` }} />

        {/* ── Sole ── */}
        <rect x={3} y={27} width={30} height={6} rx={4} fill={BODY_SOLE} />
        {/* Sole grip lines */}
        {[6, 10, 14, 18, 22, 26, 30].map(x => (
          <line key={x} x1={x} y1={28} x2={x} y2={32}
            stroke="rgba(0,0,0,0.2)" strokeWidth={0.8} />
        ))}

        {/* ── Heel counter ── */}
        <path d="M 28 27 Q 34 27 34 22 Q 34 16 29 14 L 26 14 Q 30 17 30 22 Q 30 26 28 27"
          fill={DETAIL} />

        {/* ── Main upper ── */}
        <path d="M 3 27 Q 3 12 10 10 L 28 10 Q 33 10 33 18 L 33 22 Q 33 27 28 27 Z"
          fill={BODY_TOP} />

        {/* ── Tongue ── */}
        <path d="M 8 27 Q 8 12 13 10 L 20 10 Q 20 12 20 15 L 20 27 Z"
          fill={TONGUE} />

        {/* ── Toe box highlight ── */}
        <ellipse cx={10} cy={20} rx={5} ry={4}
          fill="rgba(255,255,255,0.12)" />

        {/* ── Laces ── */}
        {[16, 19, 22].map((y, i) => (
          <g key={y}>
            <line x1={10} y1={y} x2={18} y2={y}
              stroke={LACE} strokeWidth={1.5} strokeLinecap="round"
              opacity={1 - i * 0.1} />
            {/* Lace cross ties */}
            {i < 2 && <>
              <line x1={11+i*1.5} y1={y} x2={13+i} y2={y+3}
                stroke={LACE} strokeWidth={1} strokeLinecap="round" opacity={0.6} />
              <line x1={17-i} y1={y} x2={15-i*1.5} y2={y+3}
                stroke={LACE} strokeWidth={1} strokeLinecap="round" opacity={0.6} />
            </>}
          </g>
        ))}

        {/* ── Side stripe (brand mark) ── */}
        <path d="M 22 12 Q 28 14 30 20 Q 29 23 27 24 Q 24 21 22 12"
          fill="rgba(255,255,255,0.15)" />

        {/* ── Face area (front of shoe) ── */}

        {/* Eyebrows */}
        {BROWS[mood] && (
          <path d={BROWS[mood]}
            stroke="#1a1a2e" strokeWidth={2} strokeLinecap="round" fill="none" />
        )}

        {/* Eyes */}
        <Eye cx={14} cy={20} type={eyes.left as 'circle' | 'squint' | 'wide' | 'star' | 'half'} size={2.5} />
        <Eye cx={21} cy={20} type={eyes.right as 'circle' | 'squint' | 'wide' | 'star' | 'half'} size={2.5} />

        {/* Eye shine */}
        {eyes.shine && eyes.left !== 'squint' && (
          <>
            <circle cx={15} cy={19} r={0.8} fill="white" opacity={0.9} />
            <circle cx={22} cy={19} r={0.8} fill="white" opacity={0.9} />
          </>
        )}

        {/* Mouth */}
        <path d={MOUTHS[mood]}
          stroke="#1a1a2e" strokeWidth={2} strokeLinecap="round"
          strokeLinejoin="round" fill="none" />

        {/* ── Mood extras ── */}

        {/* Celebrating: stars */}
        {mood === 'celebrating' && (
          <>
            <text x={-1} y={8} fontSize={6}>⭐</text>
            <text x={28} y={6} fontSize={5}>✨</text>
            <text x={-2} y={16} fontSize={4}>🌟</text>
          </>
        )}

        {/* Worried: sweat drop */}
        {mood === 'worried' && (
          <ellipse cx={28} cy={13} rx={1.5} ry={2.5}
            fill="#00d4ff" opacity={0.8} />
        )}

        {/* Running: motion lines */}
        {mood === 'running' && (
          <>
            <line x1={0} y1={20} x2={3} y2={20}
              stroke="#ff3d6e" strokeWidth={2} strokeLinecap="round" opacity={0.7} />
            <line x1={0} y1={24} x2={4} y2={24}
              stroke="#ff3d6e" strokeWidth={1.5} strokeLinecap="round" opacity={0.5} />
            <line x1={0} y1={28} x2={3} y2={28}
              stroke="#ff3d6e" strokeWidth={1} strokeLinecap="round" opacity={0.3} />
          </>
        )}

        {/* Sleepy: Zs */}
        {mood === 'sleepy' && (
          <>
            <text x={26} y={12} fontSize={5} fill="var(--ns-cobalt)" fontWeight="bold">z</text>
            <text x={29} y={9} fontSize={4} fill="var(--ns-cobalt)" fontWeight="bold" opacity={0.7}>z</text>
          </>
        )}
      </svg>

      {/* Speech bubble */}
      {label && (
        <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 whitespace-nowrap
          rounded-2xl px-3 py-1.5 text-xs font-black"
          style={{
            background: 'var(--color-surface-3)',
            border: '2px solid var(--color-border-2)',
            color: 'var(--color-text-primary)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
          }}>
          {label}
          {/* Bubble tail */}
          <div className="absolute right-full top-1/2 -translate-y-1/2"
            style={{
              width: 0, height: 0,
              borderTop: '5px solid transparent',
              borderBottom: '5px solid transparent',
              borderRight: '6px solid var(--color-surface-3)',
            }} />
        </div>
      )}
    </div>
  )
}
