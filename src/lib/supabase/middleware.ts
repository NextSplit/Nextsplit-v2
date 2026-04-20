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
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session — do not remove this
  const { data: { user } } = await supabase.auth.getUser()

  const url = request.nextUrl.clone()
  const isAuthRoute      = url.pathname.startsWith('/auth')
  const isOnboarding     = url.pathname.startsWith('/onboarding')
  const isPublicRoute    = url.pathname === '/' || isAuthRoute || url.pathname.startsWith('/u/')
  const isApiRoute       = url.pathname.startsWith('/api')
  const isStaticRoute    = url.pathname.startsWith('/_next') || url.pathname.startsWith('/icons') || url.pathname === '/manifest.json'

  // Not logged in → send to login
  if (!user && !isPublicRoute && !isApiRoute && !isStaticRoute) {
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  // Logged in + hitting auth pages → redirect away
  if (user && isAuthRoute && !url.pathname.startsWith('/auth/callback')) {
    // Check onboarding status
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (supabase as any)
      .from('profiles')
      .select('onboarding_complete')
      .eq('id', user.id)
      .maybeSingle()

    url.pathname = profile?.onboarding_complete ? '/today' : '/onboarding'
    return NextResponse.redirect(url)
  }

  // Logged in + going to today/plan/etc but onboarding not done → send to onboarding
  if (user && !isOnboarding && !isPublicRoute && !isApiRoute && !isStaticRoute) {
    const appRoutes = ['/today', '/plan', '/nutrition', '/profile', '/settings', '/dashboard', '/gym', '/history', '/races', '/character']
    const isAppRoute = appRoutes.some(r => url.pathname.startsWith(r))

    if (isAppRoute) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: profile } = await (supabase as any)
        .from('profiles')
        .select('onboarding_complete')
        .eq('id', user.id)
        .maybeSingle()

      if (profile && !profile.onboarding_complete) {
        url.pathname = '/onboarding'
        return NextResponse.redirect(url)
      }
    }
  }

  return supabaseResponse
}
