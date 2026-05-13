'use client'

import Link from 'next/link'
import { useState } from 'react'
import { AppHeader } from '@/components/AppHeader'
import { advisorSnapshot, type AdvisorLintSummary } from '@/lib/advisorSnapshot'
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
            <Link href="/admin/funnels"
              className="text-xs font-bold px-2.5 py-1 rounded-lg"
              style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-secondary)' }}>
              Funnels
            </Link>
            <Link href="/admin/revenue"
              className="text-xs font-bold px-2.5 py-1 rounded-lg"
              style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-secondary)' }}>
              Revenue
            </Link>
            <Link href="/admin/feedback"
              className="text-xs font-bold px-2.5 py-1 rounded-lg"
              style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-secondary)' }}>
              Feedback
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

        {/* Recent Sentry events (PR J4) */}
        <section>
          <SectionLabel>Recent Sentry events · 24h</SectionLabel>
          <SentryEvents
            tokenPresent={s.sentry_token_present}
            issues={s.sentry_issues_24h}
            total={s.sentry_total_24h}
          />
        </section>

        {/* Supabase advisor snapshot (PR J1) */}
        <section>
          <SectionLabel>DB linter · snapshot {advisorSnapshot.last_run}</SectionLabel>
          <AdvisorCard />
        </section>

        {/* Strava webhook manager (phone-friendly alternative to curl) */}
        <section>
          <SectionLabel>Strava webhook</SectionLabel>
          <StravaWebhookCard />
        </section>
      </div>
    </div>
  )
}

function AdvisorCard() {
  const [open, setOpen] = useState<'security' | 'performance' | null>(null)

  const secTotal  = advisorSnapshot.security.reduce((s, l) => s + l.count, 0)
  const perfTotal = advisorSnapshot.performance.reduce((s, l) => s + l.count, 0)
  const secWarn   = advisorSnapshot.security.filter(l => l.level === 'WARN').reduce((s, l) => s + l.count, 0)
  const perfWarn  = advisorSnapshot.performance.filter(l => l.level === 'WARN').reduce((s, l) => s + l.count, 0)

  return (
    <div className="rounded-2xl p-4"
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => setOpen(open === 'security' ? null : 'security')}
          className="text-left rounded-xl p-3 active:scale-95 transition-transform"
          style={{
            background: secWarn > 0
              ? 'linear-gradient(135deg, #f59e0b15, #f59e0b05)'
              : 'linear-gradient(135deg, #22c55e15, #22c55e05)',
            border: `1.5px solid ${secWarn > 0 ? '#f59e0b40' : '#22c55e40'}`,
          }}>
          <p className="text-[10px] font-black uppercase tracking-widest"
            style={{ color: secWarn > 0 ? '#f59e0b' : '#22c55e' }}>
            Security · {secTotal}
          </p>
          <p className="text-xl font-black mt-1" style={{ color: 'var(--color-text-primary)' }}>
            {secWarn} <span className="text-xs opacity-60">WARN</span>
          </p>
          <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
            tap for breakdown
          </p>
        </button>

        <button onClick={() => setOpen(open === 'performance' ? null : 'performance')}
          className="text-left rounded-xl p-3 active:scale-95 transition-transform"
          style={{
            background: perfWarn > 0
              ? 'linear-gradient(135deg, #3b82f615, #3b82f605)'
              : 'linear-gradient(135deg, #22c55e15, #22c55e05)',
            border: `1.5px solid ${perfWarn > 0 ? '#3b82f640' : '#22c55e40'}`,
          }}>
          <p className="text-[10px] font-black uppercase tracking-widest"
            style={{ color: perfWarn > 0 ? '#3b82f6' : '#22c55e' }}>
            Performance · {perfTotal}
          </p>
          <p className="text-xl font-black mt-1" style={{ color: 'var(--color-text-primary)' }}>
            {perfWarn} <span className="text-xs opacity-60">WARN</span>
          </p>
          <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
            tap for breakdown
          </p>
        </button>
      </div>

      {open && (
        <div className="mt-3 space-y-2">
          {(open === 'security' ? advisorSnapshot.security : advisorSnapshot.performance).map(l => (
            <AdvisorRow key={l.name} lint={l} />
          ))}
        </div>
      )}

      {advisorSnapshot.founder_actions.length > 0 && (
        <div className="mt-3 rounded-xl p-3"
          style={{ background: '#f59e0b10', border: '1.5px solid #f59e0b40' }}>
          <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: '#f59e0b' }}>
            Founder action ({advisorSnapshot.founder_actions.length})
          </p>
          {advisorSnapshot.founder_actions.map(a => (
            <div key={a.id} className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
              <strong>{a.description}</strong>
              {a.remediation_url && (
                <> · <a href={a.remediation_url} target="_blank" rel="noreferrer"
                  className="underline" style={{ color: '#3b82f6' }}>docs</a></>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="text-[10px] mt-3" style={{ color: 'var(--color-text-tertiary)' }}>
        Snapshot — refresh via <span className="font-mono">mcp__supabase__get_advisors</span> in a Claude session,
        then update <span className="font-mono">src/lib/advisorSnapshot.ts</span>.
      </p>
    </div>
  )
}

function AdvisorRow({ lint }: { lint: AdvisorLintSummary }) {
  const colour = lint.level === 'INFO' ? '#9ca3af' : lint.level === 'WARN' ? '#f59e0b' : '#ef4444'
  return (
    <div className="rounded-xl p-2.5"
      style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold font-mono truncate" style={{ color: 'var(--color-text-primary)' }}>
          {lint.name}
        </p>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-[10px] font-black px-1.5 py-0.5 rounded"
            style={{ background: `${colour}30`, color: colour }}>
            {lint.level}
          </span>
          <span className="text-sm font-black" style={{ color: 'var(--color-text-primary)' }}>
            {lint.count}
          </span>
        </div>
      </div>
      {lint.note && (
        <p className="text-[10px] mt-1 leading-snug" style={{ color: 'var(--color-text-tertiary)' }}>
          {lint.note}
        </p>
      )}
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

function StravaWebhookCard() {
  interface Sub { id: number; callback_url: string; created_at: string; updated_at: string }
  interface ListResp { status: number; subscriptions?: Sub[] | { message: string }; error?: string }
  interface CreateResp { status: number; body?: { id?: number; errors?: unknown[]; message?: string } }

  const [list, setList]     = useState<ListResp | null>(null)
  const [busy, setBusy]     = useState<'check' | 'create' | 'delete' | null>(null)
  const [result, setResult] = useState<string | null>(null)

  async function check() {
    setBusy('check'); setResult(null)
    try {
      const res = await fetch('/api/admin/strava-subscribe')
      const data = await res.json() as ListResp
      setList(data)
    } catch (e) {
      setResult(`✗ ${e instanceof Error ? e.message : 'request failed'}`)
    } finally { setBusy(null) }
  }

  async function create() {
    setBusy('create'); setResult(null)
    try {
      const res = await fetch('/api/admin/strava-subscribe', { method: 'POST' })
      const data = await res.json() as CreateResp
      if (data.status >= 200 && data.status < 300 && data.body?.id) {
        setResult(`✓ Subscription created (id ${data.body.id}). Try posting a Strava activity.`)
        check()
      } else {
        setResult(`✗ Strava returned ${data.status}: ${JSON.stringify(data.body)}`)
      }
    } catch (e) {
      setResult(`✗ ${e instanceof Error ? e.message : 'request failed'}`)
    } finally { setBusy(null) }
  }

  async function remove(id: number) {
    if (!confirm(`Delete subscription ${id}? Activities will stop syncing until you re-create.`)) return
    setBusy('delete'); setResult(null)
    try {
      const res = await fetch(`/api/admin/strava-subscribe?id=${id}`, { method: 'DELETE' })
      const data = await res.json()
      setResult(data.ok ? `✓ Deleted subscription ${id}` : `✗ Delete failed (${data.status})`)
      check()
    } catch (e) {
      setResult(`✗ ${e instanceof Error ? e.message : 'request failed'}`)
    } finally { setBusy(null) }
  }

  const subs = Array.isArray(list?.subscriptions) ? list!.subscriptions : []
  const hasSubs = subs.length > 0

  return (
    <div className="rounded-2xl p-4"
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
      <div className="flex gap-2 mb-3">
        <button onClick={check} disabled={busy !== null}
          className="text-xs font-black px-3 py-2 rounded-lg disabled:opacity-40 active:scale-95"
          style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-primary)' }}>
          {busy === 'check' ? '…' : 'Check status'}
        </button>
        <button onClick={create} disabled={busy !== null || hasSubs}
          className="text-xs font-black px-3 py-2 rounded-lg disabled:opacity-40 active:scale-95"
          style={{ background: '#22c55e', color: 'white' }}>
          {busy === 'create' ? '…' : 'Subscribe'}
        </button>
      </div>

      {list && (
        <div className="text-xs space-y-2">
          {hasSubs ? (
            subs.map(s => (
              <div key={s.id} className="rounded-xl p-2.5"
                style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
                <p className="font-bold" style={{ color: 'var(--color-text-primary)' }}>
                  ✓ Active · id {s.id}
                </p>
                <p className="font-mono text-[10px] mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
                  {s.callback_url}
                </p>
                <button onClick={() => remove(s.id)} disabled={busy !== null}
                  className="mt-2 text-[10px] font-bold px-2 py-1 rounded disabled:opacity-40 active:scale-95"
                  style={{ background: '#ef4444', color: 'white' }}>
                  Delete
                </button>
              </div>
            ))
          ) : (
            <p style={{ color: 'var(--color-text-tertiary)' }}>
              No active subscriptions. Tap <strong>Subscribe</strong> to register{' '}
              <span className="font-mono">/api/strava/webhook</span> with Strava.
            </p>
          )}
        </div>
      )}

      {result && (
        <p className="text-[10px] mt-2 leading-snug font-mono"
          style={{ color: result.startsWith('✓') ? '#22c55e' : '#ef4444' }}>
          {result}
        </p>
      )}

      <p className="text-[10px] mt-3 leading-snug" style={{ color: 'var(--color-text-tertiary)' }}>
        Strava allows one push subscription per app. Calls{' '}
        <span className="font-mono">/api/admin/strava-subscribe</span> behind the same admin gate.
      </p>
    </div>
  )
}

function fmtInt(n: number) { return n.toLocaleString('en-GB') }

function SentryEvents({ tokenPresent, issues, total }: {
  tokenPresent: boolean
  issues:       Array<{ id: string; title: string; count: number; last_seen: string; level: string; web_url: string }>
  total:        number
}) {
  if (!tokenPresent) {
    return (
      <div className="rounded-2xl p-4"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        <p className="text-xs" style={{ color: '#f59e0b' }}>
          ✗ <span className="font-mono">SENTRY_AUTH_TOKEN</span> not set
        </p>
        <p className="text-[10px] mt-1 leading-snug" style={{ color: 'var(--color-text-tertiary)' }}>
          Create a Sentry user auth token (Settings → Account → API → Auth Tokens)
          scoped to <span className="font-mono">project:read event:read</span>.
          Set <span className="font-mono">SENTRY_AUTH_TOKEN</span> on Vercel.
          For events from a single project, also set <span className="font-mono">SENTRY_PROJECT_SLUG</span>.
        </p>
      </div>
    )
  }
  return (
    <div className="rounded-2xl p-3"
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
      {total === 0 ? (
        <p className="text-xs" style={{ color: '#22c55e' }}>✓ no unresolved issues in last 24h</p>
      ) : (
        <>
          <p className="text-[10px] font-black uppercase tracking-widest mb-2"
            style={{ color: '#ef4444' }}>
            {total} unresolved issue{total !== 1 ? 's' : ''}
          </p>
          <div className="space-y-1.5">
            {issues.map(iss => {
              const colour = iss.level === 'fatal' ? '#ef4444' : iss.level === 'error' ? '#f59e0b' : '#3b82f6'
              return (
                <a key={iss.id} href={iss.web_url} target="_blank" rel="noreferrer"
                  className="block rounded-xl p-2 hover:opacity-80 transition-opacity"
                  style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-bold truncate flex-1" style={{ color: 'var(--color-text-primary)' }}>
                      {iss.title}
                    </p>
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded flex-shrink-0"
                      style={{ background: `${colour}30`, color: colour }}>
                      {iss.level}
                    </span>
                  </div>
                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
                    {iss.count}× · last {new Date(iss.last_seen).toUTCString().slice(5, 22)}
                  </p>
                </a>
              )
            })}
          </div>
          <p className="text-[10px] mt-2 leading-snug" style={{ color: 'var(--color-text-tertiary)' }}>
            Click through to Sentry. For root-cause analysis use the MCP&apos;s
            <span className="font-mono"> analyze_issue_with_seer</span> tool in a Claude session.
          </p>
        </>
      )}
    </div>
  )
}
