import * as Sentry from '@sentry/nextjs'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const squad_id = req.nextUrl.searchParams.get('squad_id')
    if (!squad_id) return NextResponse.json({ error: 'squad_id required' }, { status: 400 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = supabase as any

    const { data: monthlyKm } = await s.rpc('squad_monthly_km', { p_squad_id: squad_id })

    const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM

    return NextResponse.json({
      monthly_km: monthlyKm ?? 0,
      month: currentMonth,
    })
  } catch (err) {
    Sentry.captureException(err, { extra: { context: 'Squad stats error:' } })
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
