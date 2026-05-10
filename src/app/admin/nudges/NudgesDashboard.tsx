'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import type { NudgeRow } from './page'

// PR J — Nudge effectiveness dashboard.
//
// Reads the rows returned by nudge_effectiveness_summary() (P3.9). Per
// (message_key, template_variant) pair, exposes:
//   · sent / opened / dismissed counts
//   · open_rate (% of sent that fired opened tracking)
//   · drop_dead_rate (% dismissed without ever being opened — the actual
//     signal we want for retiring weak copy)
//
// Sortable per column; default sort is by sent_count desc so high-volume
// templates surface first. Aggregate footer shows per-key A vs B totals
// to make the comparison immediate.

interface Props {
  rows: NudgeRow[]
}

type SortKey = 'message_key' | 'template_variant' | 'sent_count' | 'opened_count' | 'dismissed_count' | 'drop_dead_count' | 'open_rate' | 'drop_dead_rate'
type SortDir = 'asc' | 'desc'

interface AggKey {
  key:    string
  a:      NudgeRow | null
  b:      NudgeRow | null
}

function fmtPct(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—'
  return `${Number(n).toFixed(1)}%`
}

function flagColour(rate: number, kind: 'open' | 'drop'): string {
  // Higher open_rate = good (cyan). Higher drop_dead_rate = bad (ember).
  if (kind === 'open') {
    if (rate >= 30) return '#00e676'
    if (rate >= 15) return '#ffb800'
    return '#ff3d6e'
  }
  if (rate >= 50) return '#ff3d6e'
  if (rate >= 30) return '#ffb800'
  return '#00e676'
}

export default function NudgesDashboard({ rows }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('sent_count')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const sorted = useMemo(() => {
    const out = [...rows]
    out.sort((a, b) => {
      const av = a[sortKey] ?? 0
      const bv = b[sortKey] ?? 0
      if (typeof av === 'string' && typeof bv === 'string') {
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      }
      return sortDir === 'asc' ? Number(av) - Number(bv) : Number(bv) - Number(av)
    })
    return out
  }, [rows, sortKey, sortDir])

  // Per-key A/B pairing for the comparison summary.
  const aggregated: AggKey[] = useMemo(() => {
    const byKey = new Map<string, AggKey>()
    for (const r of rows) {
      if (!byKey.has(r.message_key)) {
        byKey.set(r.message_key, { key: r.message_key, a: null, b: null })
      }
      const slot = byKey.get(r.message_key)!
      if (r.template_variant === 'a') slot.a = r
      else if (r.template_variant === 'b') slot.b = r
    }
    return [...byKey.values()].sort((x, y) => x.key.localeCompare(y.key))
  }, [rows])

  function toggleSort(k: SortKey) {
    if (k === sortKey) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(k)
      setSortDir('desc')
    }
  }

  function sortGlyph(k: SortKey): string {
    if (k !== sortKey) return ''
    return sortDir === 'asc' ? ' ↑' : ' ↓'
  }

  const totals = rows.reduce(
    (acc, r) => ({
      sent:      acc.sent      + (r.sent_count      ?? 0),
      opened:    acc.opened    + (r.opened_count    ?? 0),
      dismissed: acc.dismissed + (r.dismissed_count ?? 0),
      drop_dead: acc.drop_dead + (r.drop_dead_count ?? 0),
    }),
    { sent: 0, opened: 0, dismissed: 0, drop_dead: 0 },
  )
  const overallOpen     = totals.sent > 0 ? (100 * totals.opened    / totals.sent) : 0
  const overallDropDead = totals.sent > 0 ? (100 * totals.drop_dead / totals.sent) : 0

  return (
    <main className="min-h-screen pb-20" style={{ background: 'var(--color-bg)' }}>
      <header className="sticky top-0 z-10 border-b"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <div className="max-w-3xl mx-auto px-4 pt-12 pb-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--ns-violet)' }}>
              Admin · P3.9
            </p>
            <h1 className="text-base font-black" style={{ color: 'var(--color-text-primary)' }}>
              Nudge effectiveness
            </h1>
          </div>
          <Link href="/admin/retention"
            className="text-xs font-bold px-3 py-1.5 rounded-lg"
            style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-secondary)' }}>
            Retention →
          </Link>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 pt-4 space-y-4">

        {/* Overall totals */}
        <section className="rounded-2xl p-4 grid grid-cols-4 gap-3"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <Stat label="Sent"          value={String(totals.sent)} />
          <Stat label="Open rate"     value={fmtPct(overallOpen)}
                colour={flagColour(overallOpen, 'open')} />
          <Stat label="Drop-dead"     value={fmtPct(overallDropDead)}
                colour={flagColour(overallDropDead, 'drop')} />
          <Stat label="Templates"     value={String(rows.length)} />
        </section>

        {/* A vs B per-key comparison — at a glance which variant wins */}
        {aggregated.length > 0 && (
          <section className="rounded-2xl overflow-hidden"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <div className="px-4 py-3 border-b"
              style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-2)' }}>
              <p className="text-xs font-black" style={{ color: 'var(--color-text-primary)' }}>
                A vs B — per template
              </p>
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
                Greater open_rate wins. Greater drop_dead_rate is the kill signal.
              </p>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: 'var(--color-surface-2)' }}>
                  <th className="text-left px-3 py-2 font-bold" style={{ color: 'var(--color-text-tertiary)' }}>Key</th>
                  <th className="text-right px-3 py-2 font-bold" style={{ color: 'var(--color-text-tertiary)' }}>A open</th>
                  <th className="text-right px-3 py-2 font-bold" style={{ color: 'var(--color-text-tertiary)' }}>B open</th>
                  <th className="text-right px-3 py-2 font-bold" style={{ color: 'var(--color-text-tertiary)' }}>A drop</th>
                  <th className="text-right px-3 py-2 font-bold" style={{ color: 'var(--color-text-tertiary)' }}>B drop</th>
                  <th className="text-right px-3 py-2 font-bold" style={{ color: 'var(--color-text-tertiary)' }}>Verdict</th>
                </tr>
              </thead>
              <tbody>
                {aggregated.map(g => {
                  const ao = g.a?.open_rate      ?? 0
                  const bo = g.b?.open_rate      ?? 0
                  const ad = g.a?.drop_dead_rate ?? 0
                  const bd = g.b?.drop_dead_rate ?? 0
                  // Simple verdict rule: B wins if higher open AND lower
                  // drop-dead. Otherwise A wins. "—" until both have data.
                  const haveBoth = !!g.a && !!g.b && (g.a.sent_count ?? 0) > 0 && (g.b.sent_count ?? 0) > 0
                  const verdict = !haveBoth ? '—'
                    : (bo > ao && bd <= ad) ? 'B'
                    : (ao > bo && ad <= bd) ? 'A'
                    : '~'
                  return (
                    <tr key={g.key} className="border-t" style={{ borderColor: 'var(--color-border)' }}>
                      <td className="px-3 py-2 font-bold" style={{ color: 'var(--color-text-primary)' }}>{g.key}</td>
                      <td className="px-3 py-2 text-right" style={{ color: flagColour(ao, 'open') }}>{fmtPct(ao)}</td>
                      <td className="px-3 py-2 text-right" style={{ color: flagColour(bo, 'open') }}>{fmtPct(bo)}</td>
                      <td className="px-3 py-2 text-right" style={{ color: flagColour(ad, 'drop') }}>{fmtPct(ad)}</td>
                      <td className="px-3 py-2 text-right" style={{ color: flagColour(bd, 'drop') }}>{fmtPct(bd)}</td>
                      <td className="px-3 py-2 text-right font-black"
                          style={{ color: verdict === 'A' || verdict === 'B' ? 'var(--ns-cyan)' : 'var(--color-text-tertiary)' }}>
                        {verdict}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </section>
        )}

        {/* Sortable raw rows */}
        <section className="rounded-2xl overflow-hidden"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <div className="px-4 py-3 border-b"
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-2)' }}>
            <p className="text-xs font-black" style={{ color: 'var(--color-text-primary)' }}>
              All rows ({rows.length})
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: 'var(--color-surface-2)' }}>
                  <ColHead label="Key"      onClick={() => toggleSort('message_key')}      glyph={sortGlyph('message_key')} />
                  <ColHead label="Variant"  onClick={() => toggleSort('template_variant')} glyph={sortGlyph('template_variant')} />
                  <ColHead label="Sent"     onClick={() => toggleSort('sent_count')}        glyph={sortGlyph('sent_count')}        right />
                  <ColHead label="Opened"   onClick={() => toggleSort('opened_count')}      glyph={sortGlyph('opened_count')}      right />
                  <ColHead label="Dismissed" onClick={() => toggleSort('dismissed_count')}  glyph={sortGlyph('dismissed_count')}   right />
                  <ColHead label="Drop dead" onClick={() => toggleSort('drop_dead_count')}  glyph={sortGlyph('drop_dead_count')}   right />
                  <ColHead label="Open %"   onClick={() => toggleSort('open_rate')}         glyph={sortGlyph('open_rate')}         right />
                  <ColHead label="Drop %"   onClick={() => toggleSort('drop_dead_rate')}    glyph={sortGlyph('drop_dead_rate')}    right />
                </tr>
              </thead>
              <tbody>
                {sorted.length === 0 && (
                  <tr><td colSpan={8} className="px-3 py-6 text-center" style={{ color: 'var(--color-text-tertiary)' }}>
                    No nudges sent yet — data appears as users engage.
                  </td></tr>
                )}
                {sorted.map((r, i) => (
                  <tr key={`${r.message_key}-${r.template_variant}-${i}`} className="border-t"
                      style={{ borderColor: 'var(--color-border)' }}>
                    <td className="px-3 py-2 font-bold" style={{ color: 'var(--color-text-primary)' }}>{r.message_key}</td>
                    <td className="px-3 py-2 uppercase font-black"
                        style={{ color: r.template_variant === 'a' ? 'var(--ns-cyan)' : 'var(--ns-violet)' }}>
                      {r.template_variant}
                    </td>
                    <td className="px-3 py-2 text-right">{r.sent_count}</td>
                    <td className="px-3 py-2 text-right">{r.opened_count}</td>
                    <td className="px-3 py-2 text-right">{r.dismissed_count}</td>
                    <td className="px-3 py-2 text-right">{r.drop_dead_count}</td>
                    <td className="px-3 py-2 text-right" style={{ color: flagColour(r.open_rate, 'open') }}>
                      {fmtPct(r.open_rate)}
                    </td>
                    <td className="px-3 py-2 text-right" style={{ color: flagColour(r.drop_dead_rate, 'drop') }}>
                      {fmtPct(r.drop_dead_rate)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

      </div>
    </main>
  )
}

function ColHead({ label, onClick, glyph, right }: {
  label: string; onClick: () => void; glyph: string; right?: boolean
}) {
  return (
    <th className={`px-3 py-2 font-bold ${right ? 'text-right' : 'text-left'}`}
        style={{ color: 'var(--color-text-tertiary)' }}>
      <button type="button" onClick={onClick} className="font-bold">
        {label}{glyph}
      </button>
    </th>
  )
}

function Stat({ label, value, colour }: { label: string; value: string; colour?: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--color-text-tertiary)' }}>{label}</p>
      <p className="text-base font-black mt-0.5"
         style={{ color: colour ?? 'var(--color-text-primary)' }}>{value}</p>
    </div>
  )
}
