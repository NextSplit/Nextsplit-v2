'use client'

import { createClient } from '@/lib/supabase/client'
import { useMemo } from 'react'

/**
 * Returns a memoised Supabase browser client.
 * Import this hook wherever you need Supabase in a Client Component.
 */
export function useSupabase() {
  return useMemo(() => createClient(), [])
}
