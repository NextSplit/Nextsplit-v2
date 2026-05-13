// PR J15 — Resend + React Email sender util.
//
// Wraps `resend.emails.send` and renders React Email components to HTML.
// All branded transactional emails should go through here so the
// suppression list + branding stay consistent.
//
// Usage:
//   import { sendEmail } from '@/lib/email'
//   import { StreakSave } from '@/emails/StreakSave'
//   await sendEmail({
//     to: 'user@example.com',
//     subject: 'Saving your streak ⚡',
//     react: <StreakSave firstName="Alex" daysSinceLog={5} />,
//   })

import { Resend } from 'resend'
import { render } from '@react-email/render'
import { serverConfig } from '@/lib/config'
import type { ReactElement } from 'react'

interface SendArgs {
  to:      string
  subject: string
  react:   ReactElement
  from?:   string
  /** Whether the recipient has opted out of marketing emails. */
  marketing?: boolean
}

const DEFAULT_FROM = 'NextSplit <coach@nextsplit.app>'

export interface SendResult {
  ok:    boolean
  id?:   string
  error?: string
}

export async function sendEmail({
  to, subject, react, from, marketing = false,
}: SendArgs): Promise<SendResult> {
  if (!serverConfig.resendApiKey) {
    return { ok: false, error: 'RESEND_API_KEY not set' }
  }
  try {
    const resend = new Resend(serverConfig.resendApiKey)
    const html   = await render(react)
    const result = await resend.emails.send({
      from:    from ?? DEFAULT_FROM,
      to,
      subject,
      html,
      headers: {
        // RFC 8058 — one-click unsubscribe header.
        'List-Unsubscribe': '<https://nextsplit.app/settings?section=notifications>',
        ...(marketing
          ? { 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' }
          : {}),
      },
    })
    if (result.error) {
      return { ok: false, error: result.error.message }
    }
    return { ok: true, id: result.data?.id }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'send failed' }
  }
}
