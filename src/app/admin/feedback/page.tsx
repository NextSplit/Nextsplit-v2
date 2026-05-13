import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppHeader } from '@/components/AppHeader'
import Link from 'next/link'
import { feedbackSnapshot } from '@/lib/feedbackSnapshot'

// PR J5 — Vercel toolbar feedback admin surface.
//
// Renders the snapshot of unresolved toolbar comments + a launcher into
// the Vercel dashboard. Toolbar comments can't be queried from the
// runtime (Vercel's API is MCP-internal); refresh workflow documented
// in `src/lib/feedbackSnapshot.ts`.
//
// Especially useful when F1 friend testers come back — their inline
// feedback shows up here without leaving the admin pane.

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Feedback — NextSplit Admin' }

export default async function FeedbackPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const adminEmails = (process.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim()).filter(Boolean)
  if (!adminEmails.includes(user.email ?? '')) redirect('/home')

  const { unresolved, unresolved_count, last_run } = feedbackSnapshot

  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--color-bg)' }}>
      <AppHeader
        title="Feedback"
        subtitle={`Vercel toolbar · snapshot ${last_run}`}
        rightSlot={
          <Link href="/admin/health"
            className="text-xs font-bold px-2.5 py-1 rounded-lg"
            style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-secondary)' }}>
            Health
          </Link>
        }
      />

      <div className="max-w-2xl mx-auto px-4 pt-4 space-y-4">

        {/* Headline */}
        <section>
          <div className="rounded-2xl p-4"
            style={{
              background: unresolved_count > 0
                ? 'linear-gradient(135deg, #f59e0b15, #f59e0b05)'
                : 'linear-gradient(135deg, #22c55e15, #22c55e05)',
              border:     unresolved_count > 0 ? '1.5px solid #f59e0b40' : '1.5px solid #22c55e40',
            }}>
            <p className="text-[10px] font-black uppercase tracking-widest"
              style={{ color: unresolved_count > 0 ? '#f59e0b' : '#22c55e' }}>
              Unresolved
            </p>
            <p className="text-3xl font-black mt-1"
              style={{ color: 'var(--color-text-primary)', letterSpacing: '-0.02em' }}>
              {unresolved_count}
            </p>
            <p className="text-[10px] mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
              {unresolved_count === 0
                ? 'Inbox zero. Share a Vercel preview URL to start gathering feedback.'
                : 'Tap a thread to open in the Vercel dashboard.'}
            </p>
          </div>
        </section>

        {/* Thread list */}
        {unresolved.length > 0 && (
          <section>
            <SectionLabel>Threads</SectionLabel>
            <div className="space-y-2">
              {unresolved.map(t => (
                <a key={t.id} href={`https://vercel.com/feedback/${t.id}`} target="_blank" rel="noreferrer"
                  className="block rounded-2xl p-3 hover:opacity-80 transition-opacity"
                  style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-xs font-mono truncate flex-1" style={{ color: 'var(--color-text-tertiary)' }}>
                      {t.page}
                    </p>
                    <span className="text-[10px] font-bold flex-shrink-0" style={{ color: 'var(--color-text-tertiary)' }}>
                      {t.comment_count} comment{t.comment_count !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <p className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
                    {t.message}
                  </p>
                  <p className="text-[10px] mt-1.5" style={{ color: 'var(--color-text-tertiary)' }}>
                    {t.author} · {new Date(t.created_at).toUTCString().slice(5, 22)}
                    {t.branch && <> · <span className="font-mono">{t.branch}</span></>}
                  </p>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* How to use */}
        <section>
          <SectionLabel>How to use</SectionLabel>
          <div className="rounded-2xl p-4 space-y-2 text-xs"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
            <p><strong>1.</strong> Open any Vercel preview deployment URL (look for the floating widget bottom-right).</p>
            <p><strong>2.</strong> Click any element to attach a comment. Comments are anchored to the DOM node + page path.</p>
            <p><strong>3.</strong> Friend-testers (when F1 reopens) leave inline feedback the same way — they don&apos;t need a Slack or email.</p>
            <p><strong>4.</strong> Refresh this page&apos;s snapshot via the Vercel MCP in a Claude session:
              <span className="font-mono"> mcp__vercel__list_toolbar_threads</span> →
              update <span className="font-mono"> src/lib/feedbackSnapshot.ts</span>.
            </p>
            <p><strong>5.</strong> Reply/resolve directly via the MCP:
              <span className="font-mono"> reply_to_toolbar_thread</span> +
              <span className="font-mono"> change_toolbar_thread_resolve_status</span>.
            </p>
          </div>
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
