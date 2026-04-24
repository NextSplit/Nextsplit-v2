import * as Sentry from '@sentry/nextjs'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/supabase/db'

/**
 * GET /api/profile/character?user_id=X
 * Returns character data for a user — used by CharacterProfileModal.
 * Only returns public-safe data (no wellness, no private notes).
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const targetId = req.nextUrl.searchParams.get('user_id')
    if (!targetId) return NextResponse.json({ error: 'user_id required' }, { status: 400 })

    // Fetch profile — public fields only
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await db(supabase)
      .from('profiles')
      .select('id, display_name, handle, runner_class, runner_class_revealed')
      .eq('id', targetId)
      .single()

    if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Only show class if runner has seen the reveal (don't spoil it)
    const visibleClass = profile.runner_class_revealed ? profile.runner_class : null

    // Fetch XP and training stats from training_logs
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: logs } = await db(supabase)
      .from('training_logs')
      .select('done, km, logged_at, week_n')
      .eq('user_id', targetId)
      .eq('done', true)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const doneLogs  = (logs ?? []) as unknown[]
    const totalKm   = doneLogs.reduce((s, l) => s + (l.km ?? 0), 0)
    const totalRuns = doneLogs.length

    // Streak — consecutive days with at least one session
    const dateSet = new Set(doneLogs.map(l => l.logged_at?.slice(0, 10)))
    let streak = 0
    const today = new Date()
    for (let i = 0; i < 365; i++) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      if (dateSet.has(d.toISOString().slice(0, 10))) { streak++ } else break
    }

    // Simple XP from sessions (base rates)
    const xp = totalRuns * 15 + Math.round(totalKm * 2)

    // Level from XP (simplified)
    const level = Math.min(15, Math.max(1, Math.floor(Math.sqrt(xp / 50)) + 1))

    return NextResponse.json({
      character: {
        userId:      profile.id,
        displayName: profile.display_name,
        handle:      profile.handle ?? null,
        runnerClass: visibleClass,
        level,
        xp,
        totalKm,
        totalRuns,
        streak,
      },
    })
  } catch (err) {
    Sentry.captureException(err, { extra: { context: 'Character profile GET error:' } })
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}
