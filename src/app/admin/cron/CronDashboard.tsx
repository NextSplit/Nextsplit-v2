'use client'

import Link from 'next/link'
import { AppHeader } from '@/components/AppHeader'
import type { CronJobSummary, CronRunRow } from './page'

interface Props {
  jobs: CronJobSummary[]
}

export default function CronDashboard({ jobs }: Props) {
  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--color-bg)' }}>
      <AppHeader
        title="Cron"
        subtitle="Per-job run history · last 30 days"
        rightSlot={
          <Link href="/admin/ai-cost"
            className="text-xs font-bold px-3 py-1.5 rounded-lg"
            style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-secondary)' }}>
            AI cost →
          </Link>
        }
      />

      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-4">

        {jobs.length === 0 && (
          <div className="rounded-2xl p-6 text-center"
            style={{ background: 'var(--color-surface)', border: '1px dashed var(--color-border)' }}>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              No cron runs recorded yet. The ledger is fresh — fires after PR H3
              deploys will start appearing here.
            </p>
            <p className="text-[10px] mt-2" style={{ color: 'var(--color-text-tertiary)' }}>
              smart-notify fires at 14:00 UTC · race-tick fires at 22:05 UTC.
            </p>
          </div>
        )}

        {jobs.map(j => (
          <JobCard key={j.job} job={j} />
        ))}
      </div>
    </div>
  )
}

function JobCard({ job }: { job: CronJobSummary }) {
  const okRate = job.runs_30d > 0 ? (job.ok_30d / job.runs_30d) : null
  const okPct  = okRate !== null ? Math.round(okRate * 100) : null

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
      <div className="px-4 py-3 flex items-center justify-between border-b"
        style={{ borderColor: 'var(--color-border)' }}>
        <div>
          <p className="text-base font-black font-mono" style={{ color: 'var(--color-text-primary)' }}>
            {job.job}
          </p>
          <p className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>
            {job.runs_30d} runs · {job.ok_30d} ok · {job.fail_30d} failed
            {okPct !== null && ` · ${okPct}% success`}
            {job.avg_ms_30d !== null && ` · avg ${(job.avg_ms_30d / 1000).toFixed(1)}s`}
          </p>
        </div>
        <span className="text-xs font-black px-2 py-1 rounded-full"
          style={{
            background: job.last_ok === true ? 'rgba(34,197,94,0.15)'
                      : job.last_ok === false ? 'rgba(239,68,68,0.15)'
                      : 'var(--color-surface-2)',
            color:      job.last_ok === true ? '#22c55e'
                      : job.last_ok === false ? '#ef4444'
                      : 'var(--color-text-tertiary)',
            border: `1.5px solid ${job.last_ok === true ? '#22c55e55'
                                : job.last_ok === false ? '#ef444455'
                                : 'var(--color-border)'}`,
          }}>
          {job.last_ok === true ? '✓ healthy' : job.last_ok === false ? '✗ failing' : '— no runs'}
        </span>
      </div>

      <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
        {job.recent.map(r => <RunRow key={r.id} run={r} />)}
        {job.recent.length === 0 && (
          <p className="px-4 py-3 text-xs text-center"
            style={{ color: 'var(--color-text-tertiary)' }}>
            No recent runs.
          </p>
        )}
      </div>
    </div>
  )
}

function RunRow({ run }: { run: CronRunRow }) {
  const when = new Date(run.started_at).toUTCString().replace(' GMT', '')
  return (
    <div className="px-4 py-2.5 flex items-start gap-3 text-xs">
      <span className="flex-shrink-0 mt-0.5"
        style={{ color: run.ok ? '#22c55e' : '#ef4444' }}>
        {run.ok ? '✓' : '✗'}
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-mono" style={{ color: 'var(--color-text-secondary)' }}>{when}</p>
        {run.error_message && (
          <p className="font-mono text-[10px] mt-0.5"
            style={{ color: '#ef4444' }}>{run.error_message}</p>
        )}
        {run.result !== null && typeof run.result === 'object' && (
          <p className="font-mono text-[10px] mt-0.5 break-all"
            style={{ color: 'var(--color-text-tertiary)' }}>
            {summariseResult(run.result as Record<string, unknown>)}
          </p>
        )}
      </div>
      {run.duration_ms !== null && (
        <span className="font-mono text-[10px] flex-shrink-0"
          style={{ color: 'var(--color-text-tertiary)' }}>
          {(run.duration_ms / 1000).toFixed(2)}s
        </span>
      )}
    </div>
  )
}

// Compact summary of the result jsonb for inline display. For smart-notify:
// "sent N / eligible M · slot..."; falls back to JSON for unknown shapes.
function summariseResult(r: Record<string, unknown>): string {
  if ('sent' in r && 'eligible' in r) {
    const parts = [`sent ${r.sent} / eligible ${r.eligible}`]
    if (r.skippedQuietHours) parts.push(`${r.skippedQuietHours} quiet`)
    if (r.isSunday) parts.push('sunday')
    return parts.join(' · ')
  }
  if ('resolved_count' in r) {
    return `seeded ${r.seeded_was_new ? '+new' : '-cached'} · resolved ${r.resolved_count}`
  }
  return JSON.stringify(r)
}
