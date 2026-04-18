import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/today'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // For new Google users: check if they have an active plan
      // If not, send them through onboarding
      const { data: { user } } = await supabase.auth.getUser()
      if (user && next === '/today') {
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
  }

  return NextResponse.redirect(`${origin}/auth/login?error=auth_callback_failed`)
}
