import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count } = await (supabase as any)
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('is_pro', true)
    return NextResponse.json({ count: count ?? 0 }, {
      headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=600' }
    })
  } catch {
    return NextResponse.json({ count: 0 })
  }
}
