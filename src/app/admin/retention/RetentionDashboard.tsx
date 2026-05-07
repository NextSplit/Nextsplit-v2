'use client'

// P3.8 Retention dashboard — presentational. The page server-component
// loads all data via service-role; this component just renders.
//
// Three sections:
//   1. Top tiles — totals (signups, onboarded, first-log, push-subscribed)
//      + last-7-day activity counters.
//   2. Funnel — signup → onboarded → first log (% of total signups).
//   3. Daily cohort table — last 30 days, with cohort-size, D1, D7, D30
//      return rates as percentages.

interface CohortRow {
  signup_date:    string
  cohort_size:    number
  d1_returners:   number
  d7_returners:   number
  d30_returners:  number
  onboarded:      number
  first_log:      number
}

interface Props {
  cohorts:        CohortRow[]
  totals:         { signups: number; onboarded: number; first_log: number; pushSubscribed: number }
  recent7Signups: number
  recent7Logs:    number
}

function pct(num: number, denom: number): string {
  if (denom === 0) return '—'
  return `${Math.round((num / denom) * 100)}%`
}

function bandColour(rate: number): string {
  // Running-app benchmarks: D7 retention ≥ 30% is good, ≥ 50% is great.
  if (rate >= 0.5) return 'var(--ns-forest, #00e676)'
  if (rate >= 0.3) return 'var(--ns-amber,  #ffb800)'
  if (rate >= 0.15) return 'var(--ns-ember, #ff3d6e)'
  return 'var(--color-text-tertiary)'
}

export default function RetentionDashboard({
  cohorts, totals, recent7Signups, recent7Logs,
}: Props) {
  const onboardedPct = totals.signups ? totals.onboarded / totals.signups : 0
  const firstLogPct  = totals.signups ? totals.first_log / totals.signups : 0

  // Aggregate cohort rates (sum / sum, not avg of rates — un-weighted means
  // a 1-person cohort with 100% would skew the headline).
  const aggCohortSize  = cohorts.reduce((s, c) => s + c.cohort_size, 0)
  const aggD1          = cohorts.reduce((s, c) => s + c.d1_returners, 0)
  const aggD7          = cohorts.reduce((s, c) => s + c.d7_returners, 0)
  const aggD30         = cohorts.reduce((s, c) => s + c.d30_returners, 0)
  const aggOnboarded   = cohorts.reduce((s, c) => s + c.onboarded, 0)
  const aggFirstLog    = cohorts.reduce((s, c) => s + c.first_log, 0)

  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--color-bg)' }}>
      <div className="sticky top-0 z-40 border-b"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
        <div className="max-w-3xl mx-auto px-4 pt-12 pb-3">
          <h1 className="text-base font-black" style={{ color: 'var(--color-text-primary)' }}>
            Retention dashboard
          </h1>
          <p className="text-[11px] mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
            Last 30-day cohorts. Founder-only — gates the Phase 4 paywall flip (P4.0).
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 pt-4 space-y-6">

        {/* Top tiles */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Tile label="Total signups"  value={totals.signups} />
          <Tile label="Onboarded"      value={totals.onboarded}      sub={pct(totals.onboarded, totals.signups)} />
          <Tile label="≥ 1 log"        value={totals.first_log}      sub={pct(totals.first_log, totals.signups)} />
          <Tile label="Push enabled"   value={totals.pushSubscribed} sub={pct(totals.pushSubscribed, totals.signups)} />
        </div>

        {/* Last 7 days */}
        <div className="rounded-2xl px-4 py-3"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <p className="text-[10px] font-black uppercase tracking-widest"
            style={{ color: 'var(--color-text-tertiary)' }}>Last 7 days</p>
          <div className="flex gap-6 mt-2">
            <div>
              <p className="text-2xl font-black" style={{ color: 'var(--color-text-primary)' }}>{recent7Signups}</p>
              <p className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>signups</p>
            </div>
            <div>
              <p className="text-2xl font-black" style={{ color: 'var(--color-text-primary)' }}>{recent7Logs}</p>
              <p className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>sessions logged</p>
            </div>
          </div>
        </div>

        {/* Aggregate cohort retention */}
        <div className="rounded-2xl px-4 py-4"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <p className="text-[10px] font-black uppercase tracking-widest mb-3"
            style={{ color: 'var(--color-text-tertiary)' }}>
            Last 30-day cohort, aggregate
          </p>
          <div className="grid grid-cols-3 gap-3">
            <RetentionCell label="D1"  num={aggD1}  denom={aggCohortSize} />
            <RetentionCell label="D7"  num={aggD7}  denom={aggCohortSize} />
            <RetentionCell label="D30" num={aggD30} denom={aggCohortSize} />
          </div>
          <p className="text-[10px] mt-3" style={{ color: 'var(--color-text-tertiary)' }}>
            Cohort size = {aggCohortSize}. Bands: green ≥ 50%, amber ≥ 30%, red ≥ 15%.
          </p>
        </div>

        {/* Funnel */}
        <div className="rounded-2xl px-4 py-4"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <p className="text-[10px] font-black uppercase tracking-widest mb-3"
            style={{ color: 'var(--color-text-tertiary)' }}>
            Funnel — last 30-day cohort
          </p>
          <FunnelBar label="Signed up"      num={aggCohortSize} denom={aggCohortSize} />
          <FunnelBar label="Onboarded"      num={aggOnboarded}  denom={aggCohortSize} />
          <FunnelBar label="≥ 1 log"        num={aggFirstLog}   denom={aggCohortSize} />
          <FunnelBar label="D7 returner"    num={aggD7}         denom={aggCohortSize} />
          <FunnelBar label="D30 returner"   num={aggD30}        denom={aggCohortSize} />
        </div>

        {/* Lifetime totals (sanity) */}
        <div className="rounded-2xl px-4 py-3"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)' }}>
          <p className="text-[10px] font-black uppercase tracking-widest mb-2"
            style={{ color: 'var(--color-text-tertiary)' }}>
            Lifetime
          </p>
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            <span className="font-bold">{totals.signups}</span> total signups ·{' '}
            <span className="font-bold">{Math.round(onboardedPct * 100)}%</span> onboarded ·{' '}
            <span className="font-bold">{Math.round(firstLogPct * 100)}%</span> ever logged
          </p>
        </div>

        {/* Daily cohort table */}
        <div className="rounded-2xl px-2 py-2 overflow-x-auto"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <p className="text-[10px] font-black uppercase tracking-widest p-2"
            style={{ color: 'var(--color-text-tertiary)' }}>
            Daily cohorts — last 30 days
          </p>
          <table className="w-full text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            <thead>
              <tr style={{ color: 'var(--color-text-tertiary)' }}>
                <th className="text-left font-normal py-1.5 px-2">Date</th>
                <th className="text-right font-normal py-1.5 px-2">N</th>
                <th className="text-right font-normal py-1.5 px-2">Onb</th>
                <th className="text-right font-normal py-1.5 px-2">1st log</th>
                <th className="text-right font-normal py-1.5 px-2">D1</th>
                <th className="text-right font-normal py-1.5 px-2">D7</th>
                <th className="text-right font-normal py-1.5 px-2">D30</th>
              </tr>
            </thead>
            <tbody>
              {cohorts.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-4"
                    style={{ color: 'var(--color-text-tertiary)' }}>
                    No signups in the last 30 days.
                  </td>
                </tr>
              )}
              {cohorts.map(c => (
                <tr key={c.signup_date} style={{ borderTop: '1px solid var(--color-border)' }}>
                  <td className="py-1.5 px-2 font-mono">{c.signup_date}</td>
                  <td className="py-1.5 px-2 text-right">{c.cohort_size}</td>
                  <td className="py-1.5 px-2 text-right">{pct(c.onboarded, c.cohort_size)}</td>
                  <td className="py-1.5 px-2 text-right">{pct(c.first_log, c.cohort_size)}</td>
                  <td className="py-1.5 px-2 text-right" style={{ color: bandColour(c.d1_returners / Math.max(1, c.cohort_size)) }}>{pct(c.d1_returners, c.cohort_size)}</td>
                  <td className="py-1.5 px-2 text-right" style={{ color: bandColour(c.d7_returners / Math.max(1, c.cohort_size)) }}>{pct(c.d7_returners, c.cohort_size)}</td>
                  <td className="py-1.5 px-2 text-right" style={{ color: bandColour(c.d30_returners / Math.max(1, c.cohort_size)) }}>{pct(c.d30_returners, c.cohort_size)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function Tile({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="rounded-2xl px-3 py-3"
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
      <p className="text-2xl font-black" style={{ color: 'var(--color-text-primary)' }}>{value}</p>
      <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
        {label}
        {sub && <span className="ml-1 font-bold" style={{ color: 'var(--ns-cyan)' }}>{sub}</span>}
      </p>
    </div>
  )
}

function RetentionCell({ label, num, denom }: { label: string; num: number; denom: number }) {
  const rate   = denom > 0 ? num / denom : 0
  const colour = bandColour(rate)
  return (
    <div className="text-center">
      <p className="text-2xl font-black" style={{ color: colour }}>{pct(num, denom)}</p>
      <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
        {label} · {num}/{denom}
      </p>
    </div>
  )
}

function FunnelBar({ label, num, denom }: { label: string; num: number; denom: number }) {
  const pctVal = denom > 0 ? Math.round((num / denom) * 100) : 0
  return (
    <div className="mb-2 last:mb-0">
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
        <span className="text-xs font-bold" style={{ color: 'var(--color-text-primary)' }}>
          {num} <span className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>({pctVal}%)</span>
        </span>
      </div>
      <div className="h-2 rounded-full overflow-hidden"
        style={{ background: 'var(--color-surface-2)' }}>
        <div className="h-full rounded-full"
          style={{ width: `${pctVal}%`, background: 'var(--ns-cyan)', opacity: 0.7 }} />
      </div>
    </div>
  )
}
