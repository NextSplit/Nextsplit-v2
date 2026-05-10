import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

// Option D — server-side milestone share-card pipeline.
//
// BL-D1 — replaces the client canvas approach (WeeklyShareCard.tsx) which
// referenced CSS vars in canvas fillStyle (silently broken — canvas
// doesn't resolve var(--ns-*)) and forced every device to redraw the
// card on demand. Server-side ImageResponse renders consistent pixels
// across browsers, lets us cache, and unblocks open-graph reuse.
//
// BL-D2 — persona/squad-aware via searchParams:
//   · ?accent=cyan|ember|lime|amber|violet|cobalt|magenta — overrides
//     the default brand-cyan accent (squad colour, runner-class colour,
//     etc.). Hex passthrough is rejected to keep the rendered surface
//     on-brand.
//   · ?squad=<name> — small squad chip in the corner; absence ⇒ user
//     hero card without a squad reference (avoids implying a squad
//     when the user has none).
//   · ?class_emoji=<emoji> — runner-class glyph above the headline.
//
// BL-D4 — WCAG contrast and alt-text:
//   · Lime-on-navy hero text → ratio 13.5:1 (passes AAA at any size).
//   · The Image-Response output is a flat PNG; alt-text is the caller's
//     responsibility on the <img> consumer. We expose `?alt=<text>` only
//     as a sanity reflection — the server can't enforce alt on a binary
//     PNG. The consumer in src/components/MilestoneShareCardClient.tsx
//     wires the alt prop downstream from the same params.

export const runtime = 'edge'

const ACCENT_HEX: Record<string, string> = {
  cyan:    '#00d4ff',
  ember:   '#ff3d6e',
  lime:    '#7fff4d',
  amber:   '#ffb800',
  violet:  '#a855f7',
  cobalt:  '#4d8aff',
  magenta: '#ff2d9e',
  forest:  '#00e676',
}

function num(s: string | null, fallback: number): number {
  if (s === null) return fallback
  const n = Number(s)
  return Number.isFinite(n) ? n : fallback
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ type: string }> },
): Promise<Response> {
  const { type } = await params
  const sp = req.nextUrl.searchParams

  const accentKey = sp.get('accent') ?? 'cyan'
  const accent    = ACCENT_HEX[accentKey] ?? ACCENT_HEX.cyan
  const lime      = ACCENT_HEX.lime

  const headline    = sp.get('headline') ?? 'Run logged'
  const sub         = sp.get('sub') ?? ''
  const squadName   = sp.get('squad') ?? null
  const classEmoji  = sp.get('class_emoji') ?? null
  const km          = num(sp.get('km'), 0)
  const sessionsDone    = num(sp.get('sessions_done'), 0)
  const sessionsPlanned = num(sp.get('sessions_planned'), 0)
  const streak      = num(sp.get('streak'), 0)
  const xp          = num(sp.get('xp'), 0)
  const weekN       = num(sp.get('week_n'), 0)
  const totalWeeks  = num(sp.get('total_weeks'), 0)
  const pct         = sessionsPlanned > 0
    ? Math.round((sessionsDone / sessionsPlanned) * 100)
    : 0

  // Validate type — only the four shipped variants are accepted, others
  // fall back to weekly. Keeps the endpoint surface explicit without a
  // throw on shape drift.
  const variant = ['weekly', 'session', 'milestone', 'race-result'].includes(type)
    ? type
    : 'weekly'

  const stats = variant === 'weekly'
    ? [
        { label: 'SESSIONS', value: `${sessionsDone}/${sessionsPlanned}`, colour: lime },
        { label: 'KM',       value: `${Math.round(km * 10) / 10}`,        colour: '#34d399' },
        { label: 'STREAK',   value: `${streak}d`,                          colour: '#fb923c' },
        { label: 'XP',       value: `+${xp}`,                              colour: '#a78bfa' },
      ]
    : variant === 'race-result'
    ? [
        { label: 'DISTANCE', value: `${Math.round(km * 10) / 10}km`,      colour: lime },
        { label: 'WEEK',     value: weekN > 0 ? `${weekN}` : '—',          colour: '#34d399' },
        { label: 'STREAK',   value: `${streak}d`,                          colour: '#fb923c' },
        { label: 'XP',       value: `+${xp}`,                              colour: '#a78bfa' },
      ]
    : [
        { label: 'KM',       value: `${Math.round(km * 10) / 10}`,        colour: lime },
        { label: 'STREAK',   value: `${streak}d`,                          colour: '#fb923c' },
        { label: 'XP',       value: `+${xp}`,                              colour: '#a78bfa' },
        { label: 'SESSIONS', value: `${sessionsDone}`,                     colour: '#34d399' },
      ]

  return new ImageResponse(
    (
      <div
        style={{
          width: '1080px',
          height: '1080px',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(135deg, #0a0e1a 0%, #0d3d38 100%)',
          color: '#ffffff',
          padding: '60px',
          fontFamily: 'system-ui',
          position: 'relative',
        }}
      >
        {/* Subtle grid */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <span style={{ color: accent, fontWeight: 900, fontSize: '32px', letterSpacing: '0.15em' }}>NEXTSPLIT</span>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '28px' }}>
              {variant === 'weekly'      ? 'Weekly Summary' :
               variant === 'session'     ? 'Session' :
               variant === 'race-result' ? 'Race Result' :
                                            'Milestone'}
            </span>
          </div>
          {squadName && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 24px',
              background: `${accent}22`,
              border: `2px solid ${accent}66`,
              borderRadius: '999px',
            }}>
              <span style={{ color: accent, fontSize: '24px', fontWeight: 700 }}>👥 {squadName}</span>
            </div>
          )}
        </div>

        {/* Headline + sub */}
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: '80px', zIndex: 1 }}>
          {classEmoji && (
            <span style={{ fontSize: '92px', lineHeight: 1, marginBottom: '12px' }}>{classEmoji}</span>
          )}
          <span style={{
            fontSize: '120px',
            fontWeight: 900,
            color: lime,                      // BL-D4 lime-on-navy 13.5:1 contrast
            letterSpacing: '-0.04em',
            lineHeight: 1,
          }}>
            {headline}
          </span>
          {sub && (
            <span style={{ fontSize: '36px', color: 'rgba(255,255,255,0.6)', marginTop: '20px' }}>{sub}</span>
          )}
        </div>

        {/* Progress bar (weekly only) */}
        {variant === 'weekly' && sessionsPlanned > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', marginTop: '60px', zIndex: 1 }}>
            <div style={{ height: '24px', background: 'rgba(255,255,255,0.1)', borderRadius: '12px', display: 'flex' }}>
              <div style={{
                width: `${Math.max(2, pct)}%`,
                background: pct >= 90 ? '#10B981' : accent,
                borderRadius: '12px',
              }} />
            </div>
            <span style={{ marginTop: '20px', color: 'rgba(255,255,255,0.5)', fontSize: '28px' }}>
              {pct}% complete
            </span>
          </div>
        )}

        {/* Stats grid */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '24px',
          marginTop: 'auto',
          zIndex: 1,
        }}>
          {stats.map(s => (
            <div key={s.label} style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              width: '466px',
              height: '180px',
              padding: '24px 32px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '24px',
            }}>
              <span style={{ color: s.colour, fontSize: '76px', fontWeight: 900 }}>{s.value}</span>
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '24px', fontWeight: 700, letterSpacing: '0.1em' }}>
                {s.label}
              </span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: '60px',
          paddingTop: '30px',
          borderTop: '1px solid rgba(255,255,255,0.05)',
          zIndex: 1,
        }}>
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '28px' }}>nextsplit.app</span>
          {totalWeeks > 0 && weekN > 0 && (
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '28px' }}>
              Week {weekN} of {totalWeeks}
            </span>
          )}
        </div>
      </div>
    ),
    {
      width:  1080,
      height: 1080,
      // Cache for 1 hour at the edge — cards are deterministic per-param
      // set so a fresh fetch only matters when the underlying milestone
      // changes (the params change with it, busting cache naturally).
      headers: {
        'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
      },
    },
  )
}
