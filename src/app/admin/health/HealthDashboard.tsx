'use client'

import Link from 'next/link'
import { useState } from 'react'
import { AppHeader } from '@/components/AppHeader'
import type { HealthSummary } from './page'

// PR I1 — single-pane system pulse + Sentry healthcheck button.

export default function HealthDashboard(s: HealthSummary) {
  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--color-bg)' }}>
      <AppHeader
        title="Health"
        subtitle="System pulse · last 24h / 7d"
        rightSlot={
          <div className="flex items-center gap-2">
            <Link href="/admin/cron"
              className="text-xs font-bold px-2.5 py-1 rounded-lg"
              style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-secondary)' }}>
              Cron
            </Link>
            <Link href="/admin/ai-cost"
              className="text-xs font-bold px-2.5 py-1 rounded-lg"
              style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-secondary)' }}>
              AI cost
            </Link>
          </div>
        }
      />

      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-4">

        {/* CRON pulse */}
        <section>
          <SectionLabel>Cron · last 24h</SectionLabel>
          <div className="grid grid-cols-2 gap-2">
            <CronCard
              job="smart-notify"
              last={s.smart_notify_last}
              expected="Fires 14:00 UTC daily"
            />
            <CronCard
              job="race-tick"
              last={s.race_tick_last}
              expected="Fires 22:05 UTC daily"
            />
          </div>
          <p className="text-[10px] mt-2 px-1" style={{ color: 'var(--color-text-tertiary)' }}>
            {s.cron_runs_24h} run{s.cron_runs_24h !== 1 ? 's' : ''} total
            {s.cron_failures_24h > 0
              ? <> · <strong style={{ color: '#ef4444' }}>{s.cron_failures_24h} failed</strong></>
              : ' · all healthy'}
          </p>
        </section>

        {/* AI pulse */}
        <section>
          <SectionLabel>AI · today + last 24h</SectionLabel>
          <div className="grid grid-cols-2 gap-2">
            <PulseCard label="Calls today" value={s.ai_calls_today.toString()}
              subtitle={`${s.ai_users_today} user${s.ai_users_today !== 1 ? 's' : ''}`}
              colour="#a855f7" />
            <PulseCard label="Tokens 24h"
              value={fmtInt(s.ai_tokens_in_24h + s.ai_tokens_out_24h)}
              subtitle={`in ${fmtInt(s.ai_tokens_in_24h)} · out ${fmtInt(s.ai_tokens_out_24h)}`}
              colour="#a855f7" />
          </div>
        </section>

        {/* Activity pulse */}
        <section>
          <SectionLabel>Activity · last 24h + 7d</SectionLabel>
          <div className="grid grid-cols-2 gap-2">
            <PulseCard label="Logs 24h" value={s.logs_24h.toString()}
              subtitle="training_logs inserted" colour="#22c55e" />
            <PulseCard label="Push 24h" value={s.notifications_24h.toString()}
              subtitle="notifications inserted" colour="#3b82f6" />
            <PulseCard label="Signups 7d" value={s.signups_7d.toString()}
              subtitle="new profiles" colour="#ffb800" />
            <PulseCard label="Active 7d" value={s.active_users_7d.toString()}
              subtitle="distinct loggers" colour="#22c55e" />
          </div>
        </section>

        {/* Sentry diag */}
        <section>
          <SectionLabel>Sentry diagnostic</SectionLabel>
          <SentryDiag dsnPresent={s.sentry_dsn_present} />
        </section>
      </div>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-black uppercase tracking-widest mb-2 px-1"
      style={{ color: 'var(--color-text-tertiary)' }}>
      {children}
    </p>
  )
}

function PulseCard({ label, value, subtitle, colour }: {
  label: string; value: string; subtitle: string; colour: string
}) {
  return (
    <div className="rounded-2xl p-3"
      style={{
        background: `linear-gradient(135deg, ${colour}15, ${colour}05)`,
        border: `1.5px solid ${colour}40`,
      }}>
      <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: colour }}>
        {label}
      </p>
      <p className="text-2xl font-black mt-1"
        style={{ color: 'var(--color-text-primary)', letterSpacing: '-0.02em' }}>
        {value}
      </p>
      <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
        {subtitle}
      </p>
    </div>
  )
}

function CronCard({ job, last, expected }: {
  job: string
  last: { started_at: string; ok: boolean; result: unknown } | null
  expected: string
}) {
  const ok = last?.ok === true
  const colour = last === null ? '#9ca3af' : ok ? '#22c55e' : '#ef4444'
  const status = last === null ? 'no fires recorded' : ok ? '✓ healthy' : '✗ failed'
  return (
    <div className="rounded-2xl p-3"
      style={{
        background: `linear-gradient(135deg, ${colour}15, ${colour}05)`,
        border: `1.5px solid ${colour}40`,
      }}>
      <p className="text-[10px] font-black uppercase tracking-widest font-mono" style={{ color: colour }}>
        {job}
      </p>
      <p className="text-sm font-black mt-1" style={{ color: 'var(--color-text-primary)' }}>
        {status}
      </p>
      <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
        {last ? new Date(last.started_at).toUTCString().slice(5, 22) : expected}
      </p>
    </div>
  )
}

function SentryDiag({ dsnPresent }: { dsnPresent: boolean }) {
  const [result, setResult] = useState<{ eventId?: string; note?: string; error?: string } | null>(null)
  const [loading, setLoading] = useState(false)

  async function fire() {
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/diag/sentry')
      const data = await res.json()
      if (!res.ok) {
        setResult({ error: data.error ?? 'request failed' })
      } else {
        setResult({ eventId: data.eventId, note: data.note })
      }
    } catch (e) {
      setResult({ error: e instanceof Error ? e.message : 'network error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-2xl p-4"
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black" style={{ color: 'var(--color-text-primary)' }}>
            NEXT_PUBLIC_SENTRY_DSN
          </p>
          <p className="text-xs mt-0.5"
            style={{ color: dsnPresent ? '#22c55e' : '#ef4444' }}>
            {dsnPresent ? '✓ env var set' : '✗ env var MISSING — Sentry will silently no-op'}
          </p>
        </div>
        <button onClick={fire} disabled={loading || !dsnPresent}
          className="text-xs font-black px-3 py-1.5 rounded-lg disabled:opacity-40 active:scale-95"
          style={{ background: '#a855f7', color: 'white' }}>
          {loading ? '…' : 'Fire test event'}
        </button>
      </div>

      {result && (
        <div className="mt-3 rounded-xl p-3 text-xs space-y-1"
          style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
          {result.eventId && (
            <p style={{ color: 'var(--color-text-primary)' }}>
              ✓ event id: <span className="font-mono">{result.eventId}</span>
            </p>
          )}
          {result.note && (
            <p style={{ color: 'var(--color-text-tertiary)' }}>{result.note}</p>
          )}
          {result.error && (
            <p style={{ color: '#ef4444' }}>✗ {result.error}</p>
          )}
        </div>
      )}

      <p className="text-[10px] mt-2" style={{ color: 'var(--color-text-tertiary)' }}>
        Search Sentry for{' '}<span className="font-mono">feature:sentry-healthcheck</span>{' '}
        after firing — should appear within ~30s if wiring is healthy.
      </p>
    </div>
  )
}

function fmtInt(n: number) { return n.toLocaleString('en-GB') }
