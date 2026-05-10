'use client'

import Link from 'next/link'
import type { FunnelData, TrialRow, SourceMetrics } from './page'

// PR L — BL-C6 trial conversion funnel.
//
// 4-cell totals strip → per-source comparison table → 30-day timeseries
// → recent 30 trials list. The conversion-rate signal answers the
// strategic question: is the squad-join onramp better at converting
// trial → paid than the first-coach-msg onramp?

interface Props {
  data: FunnelData
}

const STATUS_STYLE: Record<TrialRow['status'], { dot: string; label: string; tone: string }> = {
  active:    { dot: '#00d4ff', label: 'Active',    tone: 'rgba(0,212,255,0.10)' },
  converted: { dot: '#00e676', label: 'Converted', tone: 'rgba(0,230,118,0.10)' },
  lapsed:    { dot: '#9aa4b8', label: 'Lapsed',    tone: 'rgba(154,164,184,0.10)' },
}

const SOURCE_LABEL: Record<string, string> = {
  squad_join:          'Squad join',
  first_coach_message: 'Coach message',
}

function fmtPct(n: number): string {
  return `${n.toFixed(1)}%`
}

function timeAgo(iso: string): string {
  const ms   = Date.now() - new Date(iso).getTime()
  const hrs  = Math.floor(ms / 3_600_000)
  if (hrs < 1)  return 'just now'
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7)  return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return `${Math.floor(days / 30)}mo ago`
}

function rateColour(pct: number): string {
  if (pct >= 20) return '#00e676'
  if (pct >= 10) return '#ffb800'
  return '#ff3d6e'
}

export default function TrialsDashboard({ data }: Props) {
  const { totals, bySource, recent, dailyGranted } = data

  const peak = Math.max(1, ...dailyGranted.map(d => d.squad_join + d.first_coach_message))

  return (
    <main className="min-h-screen pb-20" style={{ background: 'var(--color-bg)' }}>
      <header className="sticky top-0 z-10 border-b"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <div className="max-w-3xl mx-auto px-4 pt-12 pb-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--ns-violet)' }}>
              Admin · BL-C6
            </p>
            <h1 className="text-base font-black" style={{ color: 'var(--color-text-primary)' }}>
              Trial conversion funnel
            </h1>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/nudges"
              className="text-xs font-bold px-3 py-1.5 rounded-lg"
              style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-secondary)' }}>
              Nudges
            </Link>
            <Link href="/admin/retention"
              className="text-xs font-bold px-3 py-1.5 rounded-lg"
              style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-secondary)' }}>
              Retention
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 pt-4 space-y-4">

        {/* Overall totals */}
        <section className="rounded-2xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-3"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <Stat label="Granted"   value={String(totals.granted)} />
          <Stat label="Active"    value={String(totals.active)}    colour="#00d4ff" />
          <Stat label="Converted" value={String(totals.converted)} colour="#00e676" />
          <Stat label="Conv rate" value={fmtPct(totals.conversion_rate)} colour={rateColour(totals.conversion_rate)} />
        </section>

        {/* Per-source comparison */}
        <section className="rounded-2xl overflow-hidden"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <div className="px-4 py-3 border-b"
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-2)' }}>
            <p className="text-xs font-black" style={{ color: 'var(--color-text-primary)' }}>
              By source
            </p>
            <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
              Higher conv rate = the better onramp.
            </p>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: 'var(--color-surface-2)' }}>
                <th className="text-left  px-3 py-2 font-bold" style={{ color: 'var(--color-text-tertiary)' }}>Source</th>
                <th className="text-right px-3 py-2 font-bold" style={{ color: 'var(--color-text-tertiary)' }}>Granted</th>
                <th className="text-right px-3 py-2 font-bold" style={{ color: 'var(--color-text-tertiary)' }}>Active</th>
                <th className="text-right px-3 py-2 font-bold" style={{ color: 'var(--color-text-tertiary)' }}>Converted</th>
                <th className="text-right px-3 py-2 font-bold" style={{ color: 'var(--color-text-tertiary)' }}>Lapsed</th>
                <th className="text-right px-3 py-2 font-bold" style={{ color: 'var(--color-text-tertiary)' }}>Conv %</th>
              </tr>
            </thead>
            <tbody>
              {bySource.map((s: SourceMetrics) => (
                <tr key={s.source} className="border-t" style={{ borderColor: 'var(--color-border)' }}>
                  <td className="px-3 py-2 font-bold" style={{ color: 'var(--color-text-primary)' }}>
                    {SOURCE_LABEL[s.source] ?? s.source}
                  </td>
                  <td className="px-3 py-2 text-right">{s.granted}</td>
                  <td className="px-3 py-2 text-right" style={{ color: '#00d4ff' }}>{s.active}</td>
                  <td className="px-3 py-2 text-right" style={{ color: '#00e676' }}>{s.converted}</td>
                  <td className="px-3 py-2 text-right" style={{ color: 'var(--color-text-tertiary)' }}>{s.lapsed}</td>
                  <td className="px-3 py-2 text-right font-black"
                      style={{ color: rateColour(s.conversion_rate) }}>
                    {fmtPct(s.conversion_rate)}
                  </td>
                </tr>
              ))}
              {bySource.every(s => s.granted === 0) && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center"
                      style={{ color: 'var(--color-text-tertiary)' }}>
                    No trials granted yet. Data appears as users join squads or get coach messages.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        {/* 30-day daily timeseries */}
        {dailyGranted.length > 0 && (
          <section className="rounded-2xl p-4"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <p className="text-xs font-black mb-1" style={{ color: 'var(--color-text-primary)' }}>
              Daily granted (30d)
            </p>
            <p className="text-[10px] mb-3" style={{ color: 'var(--color-text-tertiary)' }}>
              Cyan = squad-join · violet = coach-message · stacked
            </p>
            <div className="flex items-end gap-1" style={{ height: 80 }}>
              {dailyGranted.map(d => {
                const total = d.squad_join + d.first_coach_message
                const sjPct = (d.squad_join / peak) * 100
                const cmPct = (d.first_coach_message / peak) * 100
                return (
                  <div
                    key={d.date}
                    className="flex-1 flex flex-col-reverse"
                    style={{ minWidth: 4 }}
                    title={`${d.date}: ${d.squad_join} squad / ${d.first_coach_message} coach (${total} total)`}
                  >
                    {d.squad_join > 0 && (
                      <div style={{ height: `${sjPct}%`, background: '#00d4ff' }} />
                    )}
                    {d.first_coach_message > 0 && (
                      <div style={{ height: `${cmPct}%`, background: '#a855f7' }} />
                    )}
                  </div>
                )
              })}
            </div>
            <div className="flex justify-between mt-2 text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>
              <span>{dailyGranted[0]?.date ?? ''}</span>
              <span>peak {peak}</span>
              <span>{dailyGranted[dailyGranted.length - 1]?.date ?? ''}</span>
            </div>
          </section>
        )}

        {/* Recent trials list */}
        <section className="rounded-2xl overflow-hidden"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <div className="px-4 py-3 border-b"
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-2)' }}>
            <p className="text-xs font-black" style={{ color: 'var(--color-text-primary)' }}>
              Recent trials ({recent.length})
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: 'var(--color-surface-2)' }}>
                  <th className="text-left  px-3 py-2 font-bold" style={{ color: 'var(--color-text-tertiary)' }}>User</th>
                  <th className="text-left  px-3 py-2 font-bold" style={{ color: 'var(--color-text-tertiary)' }}>Source</th>
                  <th className="text-left  px-3 py-2 font-bold" style={{ color: 'var(--color-text-tertiary)' }}>Started</th>
                  <th className="text-left  px-3 py-2 font-bold" style={{ color: 'var(--color-text-tertiary)' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {recent.length === 0 && (
                  <tr><td colSpan={4} className="px-3 py-6 text-center"
                          style={{ color: 'var(--color-text-tertiary)' }}>
                    No trials yet.
                  </td></tr>
                )}
                {recent.map(r => {
                  const style = STATUS_STYLE[r.status]
                  return (
                    <tr key={r.user_id} className="border-t" style={{ borderColor: 'var(--color-border)' }}>
                      <td className="px-3 py-2">
                        <div className="font-bold" style={{ color: 'var(--color-text-primary)' }}>
                          {r.display_name ?? '—'}
                        </div>
                        {r.email && (
                          <div className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>
                            {r.email}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2" style={{ color: 'var(--color-text-secondary)' }}>
                        {SOURCE_LABEL[r.trial_source ?? ''] ?? r.trial_source ?? '—'}
                      </td>
                      <td className="px-3 py-2" style={{ color: 'var(--color-text-tertiary)' }}>
                        {timeAgo(r.trial_started_at)}
                      </td>
                      <td className="px-3 py-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1.5"
                              style={{ background: style.tone, color: style.dot }}>
                          <span aria-hidden className="w-1.5 h-1.5 rounded-full"
                                style={{ background: style.dot }} />
                          {style.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>

      </div>
    </main>
  )
}

function Stat({ label, value, colour }: { label: string; value: string; colour?: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wide"
         style={{ color: 'var(--color-text-tertiary)' }}>{label}</p>
      <p className="text-base font-black mt-0.5"
         style={{ color: colour ?? 'var(--color-text-primary)' }}>{value}</p>
    </div>
  )
}
