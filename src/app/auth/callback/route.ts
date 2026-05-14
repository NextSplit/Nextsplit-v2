import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CURRENT_TERMS_VERSION } from '@/lib/legal/terms-version'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/home'

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/login?error=auth_callback_failed`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    return NextResponse.redirect(`${origin}/auth/login?error=auth_callback_failed`)
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(`${origin}/auth/login?error=auth_callback_failed`)
  }

  // K33 — OAuth users must accept the terms + confirm age the same as
  // email/password users. The previous flow created a session and
  // routed straight to /home or /onboarding, bypassing clickwrap. If
  // either consent is missing or stale, route through the interstitial.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('terms_accepted_at, terms_version, age_confirmed_at')
    .eq('id', user.id)
    .maybeSingle()

  const needsConsent =
    !profile ||
    !profile.terms_accepted_at ||
    !profile.age_confirmed_at  ||
    (profile.terms_version ?? 0) < CURRENT_TERMS_VERSION

  if (needsConsent) {
    const safeNext = encodeURIComponent(next)
    return NextResponse.redirect(`${origin}/auth/accept-terms?next=${safeNext}`)
  }

  // Existing onboarding routing for users who already have terms but
  // not yet a plan.
  if (next === '/home') {
    const { data: plan } = await supabase
      .from('user_plans')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle()

    if (!plan) {
      return NextResponse.redirect(`${origin}/onboarding`)
    }
  }
  return NextResponse.redirect(`${origin}${next}`)
}
