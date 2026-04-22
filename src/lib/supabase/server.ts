import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from Server Component — middleware will handle session refresh
          }
        },
      },
    }
  )
}

// Service role client — bypasses RLS for server-side admin reads
// Only use when auth.uid() is not available in server context
export function createServiceClient() {
  // Dynamic import to avoid ESM/CJS issues
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createClient: createSupabaseClient } = require('@supabase/supabase-js')
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error('[createServiceClient] Missing env vars - URL:', !!url, 'KEY:', !!key)
    throw new Error('Missing Supabase service role configuration')
  }
  return createSupabaseClient(url, key, { auth: { persistSession: false } })
}
