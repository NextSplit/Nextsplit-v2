import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppHeader } from '@/components/AppHeader'
import Link from 'next/link'

// PR J10 — PostHog funnel reference + dashboard launchpad.
//
// PostHog dashboards require organisation-level auth and can't be embedded
// via iframe without a sharing token. This page is a reference index of
// the AARRR funnels the codebase tracks plus a launcher into PostHog.
//
// To wire actual dashboards: set NEXT_PUBLIC_POSTHOG_PROJECT_URL on Vercel
// to e.g. `https://eu.posthog.com/project/12345`; this page builds links
// against that.

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Funnels — NextSplit Admin' }

interface FunnelEntry {
  name:       string
  events:     string[]
  notes?:     string
}

const FUNNELS: Array<{ stage: string; colour: string; funnels: FunnelEntry[] }> = [
  {
    stage:  'Acquisition',
    colour: '#3b82f6',
    funnels: [
      { name: 'Signup → first plan',  events: ['$pageview /auth/signup', 'onboarding_started', 'onboarding_completed', 'plan_activated'] },
      { name: 'Onboarding step drop-off', events: ['onboarding_started', 'onboarding_step_viewed', 'onboarding_completed'], notes: 'Step name in props.step' },
    ],
  },
  {
    stage:  'Activation',
    colour: '#22c55e',
    funnels: [
      { name: 'Day-1 logging',         events: ['onboarding_completed', 'session_logged', 'log_completed'] },
      { name: 'First week through',    events: ['session_logged', 'week_advanced'] },
      { name: 'Adaptation usage',      events: ['adaptation_requested', 'adaptation_completed'] },
    ],
  },
  {
    stage:  'Retention',
    colour: '#a855f7',
    funnels: [
      { name: 'Day-7 retention',       events: ['onboarding_completed', 'session_logged (day 0)', 'session_logged (day 7)'] },
      { name: 'Squad accountability',  events: ['nudge_sent', 'nudge_opened', 'session_logged within 24h'] },
      { name: 'Character unlock',      events: ['session_logged x N', 'class_revealed'] },
      { name: 'Celebration loop',      events: ['session_logged', 'celebration_screen_shown'] },
    ],
  },
  {
    stage:  'Revenue',
    colour: '#f59e0b',
    funnels: [
      { name: 'Upgrade conversion',    events: ['upgrade_prompt_shown', 'upgrade_clicked', 'checkout_completed (Stripe webhook)'] },
      { name: 'Marketplace browse',    events: ['$pageview /marketplace', 'plan_purchased'] },
    ],
  },
  {
    stage:  'Referral',
    colour: '#ec4899',
    funnels: [
      { name: 'Referral loop',         events: ['referral_sent', 'signup (with ref code)', 'referral_converted'] },
      { name: 'Share-card virality',   events: ['share_card_generated', 'share_card_shared'] },
    ],
  },
]

export default async function FunnelsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const adminEmails = (process.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim()).filter(Boolean)
  if (!adminEmails.includes(user.email ?? '')) redirect('/home')

  const projectUrl = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_URL ?? ''
  const phKey      = process.env.NEXT_PUBLIC_POSTHOG_KEY ?? ''
  const replayRate = process.env.NEXT_PUBLIC_POSTHOG_REPLAY_SAMPLE_RATE ?? '0.1'

  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--color-bg)' }}>
      <AppHeader
        title="Funnels"
        subtitle="PostHog event taxonomy · launcher"
        rightSlot={
          <Link href="/admin/health"
            className="text-xs font-bold px-2.5 py-1 rounded-lg"
            style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-secondary)' }}>
            Health
          </Link>
        }
      />

      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-4">

        {/* Config status */}
        <section>
          <SectionLabel>PostHog config</SectionLabel>
          <div className="rounded-2xl p-3" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <ConfigRow label="NEXT_PUBLIC_POSTHOG_KEY"            ok={!!phKey}      value={phKey ? `${phKey.slice(0, 8)}…` : 'NOT SET'} />
            <ConfigRow label="NEXT_PUBLIC_POSTHOG_PROJECT_URL"    ok={!!projectUrl} value={projectUrl || 'NOT SET'} />
            <ConfigRow label="Replay sample rate"                 ok={true}         value={`${(Number(replayRate) * 100).toFixed(0)}%`} />
            {!projectUrl && (
              <p className="text-[10px] mt-2 leading-snug" style={{ color: '#f59e0b' }}>
                Set <span className="font-mono">NEXT_PUBLIC_POSTHOG_PROJECT_URL</span> on Vercel
                (e.g. <span className="font-mono">https://eu.posthog.com/project/12345</span>) to
                turn the launcher buttons below into deep links.
              </p>
            )}
          </div>
        </section>

        {/* Launchers */}
        <section>
          <SectionLabel>Launch in PostHog</SectionLabel>
          <div className="grid grid-cols-2 gap-2">
            <LaunchCard projectUrl={projectUrl} path="/insights"        label="Insights"  colour="#3b82f6" />
            <LaunchCard projectUrl={projectUrl} path="/dashboard"       label="Dashboards" colour="#22c55e" />
            <LaunchCard projectUrl={projectUrl} path="/replay"          label="Replays"   colour="#a855f7" />
            <LaunchCard projectUrl={projectUrl} path="/feature_flags"   label="Flags"     colour="#f59e0b" />
          </div>
        </section>

        {/* Funnels reference */}
        {FUNNELS.map(group => (
          <section key={group.stage}>
            <SectionLabel>{group.stage}</SectionLabel>
            <div className="space-y-2">
              {group.funnels.map(f => (
                <div key={f.name} className="rounded-2xl p-3"
                  style={{
                    background: `linear-gradient(135deg, ${group.colour}10, ${group.colour}03)`,
                    border:     `1.5px solid ${group.colour}30`,
                  }}>
                  <p className="text-sm font-black" style={{ color: 'var(--color-text-primary)' }}>
                    {f.name}
                  </p>
                  <ol className="text-xs mt-1.5 space-y-0.5 list-decimal list-inside"
                    style={{ color: 'var(--color-text-secondary)' }}>
                    {f.events.map(ev => (
                      <li key={ev} className="font-mono">{ev}</li>
                    ))}
                  </ol>
                  {f.notes && (
                    <p className="text-[10px] mt-1.5" style={{ color: 'var(--color-text-tertiary)' }}>
                      {f.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}

        <p className="text-[10px] px-1" style={{ color: 'var(--color-text-tertiary)' }}>
          Event taxonomy lives in <span className="font-mono">src/lib/analytics.ts</span>. Add a new
          event there before referencing it in a funnel — keeps the taxonomy a single source of truth.
        </p>
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

function ConfigRow({ label, ok, value }: { label: string; ok: boolean; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1">
      <span className="text-xs font-mono" style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
      <span className="text-xs font-bold" style={{ color: ok ? '#22c55e' : '#ef4444' }}>
        {ok ? '✓' : '✗'} {value}
      </span>
    </div>
  )
}

function LaunchCard({ projectUrl, path, label, colour }: {
  projectUrl: string; path: string; label: string; colour: string
}) {
  const disabled = !projectUrl
  const href     = projectUrl ? `${projectUrl}${path}` : '#'
  return (
    <a href={href} target="_blank" rel="noreferrer"
      aria-disabled={disabled}
      onClick={(e) => { if (disabled) e.preventDefault() }}
      className={`rounded-2xl p-3 text-left active:scale-95 transition-transform ${disabled ? 'opacity-40 pointer-events-none' : ''}`}
      style={{
        background: `linear-gradient(135deg, ${colour}15, ${colour}05)`,
        border:     `1.5px solid ${colour}40`,
      }}>
      <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: colour }}>
        {label}
      </p>
      <p className="text-xs font-mono mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
        {path}
      </p>
    </a>
  )
}
