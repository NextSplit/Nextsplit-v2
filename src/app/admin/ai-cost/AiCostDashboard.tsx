'use client'

import Link from 'next/link'
import { AppHeader } from '@/components/AppHeader'
import type {
  AiCostDailyRow, AiCostTopUserRow, AiCostFeatureRow,
} from './page'

// PR G2 — internal AI cost dashboard. Read-only view of last-30d Anthropic
// API usage projected through Sonnet 4.6 list pricing. Surfaces:
//   • Today's spend + naive 30d projection
//   • Daily breakdown table (30 rows)
//   • Top 10 users by 30d cost
//   • Per-feature aggregation (when `feature` column populated)

interface Props {
  daily30:           AiCostDailyRow[]
  topUsers30:        AiCostTopUserRow[]
  features30:        AiCostFeatureRow[]
  totals30:          { calls: number; tokens_in: number; tokens_out: number; cost_usd: number; active_users: number }
  todayCost:         number
  monthlyProjection: number
}

function fmtCost(n: number) { return `$${n.toFixed(2)}` }
function fmtInt(n: number)  { return n.toLocaleString('en-GB') }

export default function AiCostDashboard({
  daily30, topUsers30, features30, totals30, todayCost, monthlyProjection,
}: Props) {
  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--color-bg)' }}>
      <AppHeader
        title="AI cost"
        subtitle="Anthropic API spend · last 30 days"
        rightSlot={
          <Link href="/admin/retention"
            className="text-xs font-bold px-3 py-1.5 rounded-lg"
            style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-secondary)' }}>
            ← Retention
          </Link>
        }
      />

      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-4">

        {/* Headline numbers — grid of 4 */}
        <div className="grid grid-cols-2 gap-2">
          <HeadlineCard label="Today" value={fmtCost(todayCost)} colour="#ffb800" subtitle="USD billed today" />
          <HeadlineCard label="Projected (30d)" value={fmtCost(monthlyProjection)} colour="#a855f7"
            subtitle="Rolling forward at current rate" />
          <HeadlineCard label="30-day total" value={fmtCost(totals30.cost_usd)} colour="#3b82f6"
            subtitle={`${fmtInt(totals30.calls)} calls · ${totals30.active_users} users`} />
          <HeadlineCard label="Avg cost / call" value={
              totals30.calls > 0 ? fmtCost(totals30.cost_usd / totals30.calls) : '—'
            }
            colour="#22c55e"
            subtitle={`In: ${fmtInt(totals30.tokens_in)} · Out: ${fmtInt(totals30.tokens_out)}`} />
        </div>

        <p className="text-[10px] px-1" style={{ color: 'var(--color-text-tertiary)' }}>
          Pricing: Claude Sonnet 4.6 list — $3/M input · $15/M output. Cache-hit
          discount not factored (over-estimates cache-heavy endpoints).
        </p>

        {/* Daily table */}
        <section>
          <p className="text-[10px] font-black uppercase tracking-widest mb-2 px-1"
            style={{ color: 'var(--color-text-tertiary)' }}>Daily breakdown</p>
          <div className="rounded-2xl overflow-hidden"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <table className="w-full text-xs">
              <thead style={{ background: 'var(--color-surface-2)' }}>
                <tr>
                  <Th>Date</Th><Th right>Users</Th><Th right>Calls</Th>
                  <Th right>In</Th><Th right>Out</Th><Th right>Cost</Th>
                </tr>
              </thead>
              <tbody>
                {daily30.length === 0 && (
                  <tr><td colSpan={6} className="px-3 py-4 text-center"
                    style={{ color: 'var(--color-text-tertiary)' }}>
                    No AI usage in the last 30 days.
                  </td></tr>
                )}
                {daily30.map(r => (
                  <tr key={r.date} className="border-t" style={{ borderColor: 'var(--color-border)' }}>
                    <Td mono>{r.date}</Td>
                    <Td right>{r.users}</Td>
                    <Td right>{r.calls}</Td>
                    <Td right mono dim>{fmtInt(r.tokens_in)}</Td>
                    <Td right mono dim>{fmtInt(r.tokens_out)}</Td>
                    <Td right mono><strong style={{ color: '#ffb800' }}>{fmtCost(r.cost_usd)}</strong></Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Top users */}
        <section>
          <p className="text-[10px] font-black uppercase tracking-widest mb-2 px-1"
            style={{ color: 'var(--color-text-tertiary)' }}>Top users (30d)</p>
          <div className="rounded-2xl overflow-hidden"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <table className="w-full text-xs">
              <thead style={{ background: 'var(--color-surface-2)' }}>
                <tr>
                  <Th>User</Th><Th right>Calls</Th><Th right>Tokens</Th><Th right>Cost</Th>
                </tr>
              </thead>
              <tbody>
                {topUsers30.length === 0 && (
                  <tr><td colSpan={4} className="px-3 py-4 text-center"
                    style={{ color: 'var(--color-text-tertiary)' }}>
                    No user activity yet.
                  </td></tr>
                )}
                {topUsers30.map(u => (
                  <tr key={u.user_id} className="border-t" style={{ borderColor: 'var(--color-border)' }}>
                    <Td>
                      <span className="font-bold">{u.display_name ?? '(no name)'}</span>
                      <br />
                      <span className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>
                        {u.user_id.slice(0, 8)}…
                      </span>
                    </Td>
                    <Td right>{u.calls}</Td>
                    <Td right mono dim>{fmtInt(u.tokens_in + u.tokens_out)}</Td>
                    <Td right mono><strong style={{ color: '#ffb800' }}>{fmtCost(u.cost_usd)}</strong></Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Per-feature */}
        <section>
          <p className="text-[10px] font-black uppercase tracking-widest mb-2 px-1"
            style={{ color: 'var(--color-text-tertiary)' }}>By feature (30d)</p>
          <div className="rounded-2xl overflow-hidden"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <table className="w-full text-xs">
              <thead style={{ background: 'var(--color-surface-2)' }}>
                <tr>
                  <Th>Feature</Th><Th right>Calls</Th><Th right>Tokens</Th><Th right>Cost</Th>
                </tr>
              </thead>
              <tbody>
                {features30.length === 0 && (
                  <tr><td colSpan={4} className="px-3 py-4 text-center"
                    style={{ color: 'var(--color-text-tertiary)' }}>
                    No feature-labelled calls yet — endpoints not yet tagging
                    via the `feature` column.
                  </td></tr>
                )}
                {features30.map(f => (
                  <tr key={f.feature} className="border-t" style={{ borderColor: 'var(--color-border)' }}>
                    <Td mono>{f.feature}</Td>
                    <Td right>{f.calls}</Td>
                    <Td right mono dim>{fmtInt(f.tokens_in + f.tokens_out)}</Td>
                    <Td right mono><strong style={{ color: '#ffb800' }}>{fmtCost(f.cost_usd)}</strong></Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

      </div>
    </div>
  )
}

function HeadlineCard({ label, value, colour, subtitle }: {
  label: string; value: string; colour: string; subtitle: string
}) {
  return (
    <div className="rounded-2xl p-4"
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
      <p className="text-[10px] mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
        {subtitle}
      </p>
    </div>
  )
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th className={`px-3 py-2 text-[10px] font-black uppercase tracking-widest ${right ? 'text-right' : 'text-left'}`}
      style={{ color: 'var(--color-text-tertiary)' }}>
      {children}
    </th>
  )
}

function Td({ children, right, mono, dim }: {
  children: React.ReactNode; right?: boolean; mono?: boolean; dim?: boolean
}) {
  return (
    <td className={`px-3 py-2 ${right ? 'text-right' : 'text-left'} ${mono ? 'font-mono' : ''}`}
      style={{ color: dim ? 'var(--color-text-tertiary)' : 'var(--color-text-primary)' }}>
      {children}
    </td>
  )
}
