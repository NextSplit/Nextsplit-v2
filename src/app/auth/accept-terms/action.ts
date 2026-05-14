'use server'

import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { CURRENT_TERMS_VERSION } from '@/lib/legal/terms-version'

export async function acceptTermsAction() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not signed in' }

  const now = new Date().toISOString()
  const hdr = await headers()
  const ip  = hdr.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null
  const ua  = hdr.get('user-agent') ?? null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: profErr } = await (supabase as any)
    .from('profiles')
    .upsert({
      id:                  user.id,
      terms_accepted_at:   now,
      terms_version:       CURRENT_TERMS_VERSION,
      age_confirmed_at:    now,
    }, { onConflict: 'id' })
  if (profErr) return { error: profErr.message }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('account_lifecycle_events')
    .insert({
      user_id:    user.id,
      event_type: 'terms_accepted',
      ip_address: ip,
      user_agent: ua,
      metadata:   { terms_version: CURRENT_TERMS_VERSION, via: 'oauth_interstitial' },
    })

  return { ok: true }
}
