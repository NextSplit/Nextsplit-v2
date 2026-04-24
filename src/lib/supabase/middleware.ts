import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/database'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const url           = request.nextUrl.clone()
  const isAuthRoute   = url.pathname.startsWith('/auth')
  const isOnboarding  = url.pathname.startsWith('/onboarding')
  const isPublic      = url.pathname === '/' || isAuthRoute || url.pathname.startsWith('/u/') || url.pathname === '/privacy' || url.pathname === '/terms' || url.pathname.startsWith('/invite/') || url.pathname.startsWith('/marketplace') || (url.pathname.startsWith('/coach/') && !url.pathname.startsWith('/coach/setup') && !url.pathname.startsWith('/coach/squad') && !url.pathname.startsWith('/coach/athlete') && !url.pathname.startsWith('/coach/plan-builder') && !url.pathname.startsWith('/coach/accept'))
  const isApi         = url.pathname.startsWith('/api')
  const isStatic      = url.pathname.startsWith('/_next') || url.pathname.startsWith('/icons') || url.pathname === '/manifest.json'

  // Not logged in → login
  if (!user && !isPublic && !isApi && !isStatic) {
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  // Logged in + hitting auth pages → check onboarding
  if (user && isAuthRoute && !url.pathname.startsWith('/auth/callback')) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (supabase as any)
      .from('profiles')
      .select('onboarding_complete')
      .eq('id', user.id)
      .maybeSingle()

    // New users may have no profile row yet — treat as incomplete
    url.pathname = profile?.onboarding_complete ? '/home' : '/onboarding'
    return NextResponse.redirect(url)
  }

  // Logged in + hitting app routes + onboarding not done → onboarding
  const appRoutes = ['/home', '/train', '/nutrition', '/profile', '/settings', '/dashboard', '/gym', '/history', '/races', '/character', '/coach', '/marketplace', '/community']
  const isAppRoute = appRoutes.some(r => url.pathname.startsWith(r))

  if (user && isAppRoute && !isOnboarding) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (supabase as any)
      .from('profiles')
      .select('onboarding_complete')
      .eq('id', user.id)
      .maybeSingle()

    // No profile row OR onboarding_complete is false → onboarding
    if (!profile || !profile.onboarding_complete) {
      url.pathname = '/onboarding'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
