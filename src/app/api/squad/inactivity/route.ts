import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/squad/inactivity
 * Called by the leader's squad dashboard on load.
 * Returns inactivity status for the leader's squad:
 *   - members inactive 45+ days (flagged for removal prompt)
 *   - leader inactive 5+ months (warning)
 *   - leader inactive 6+ months (disband + notify)
 *
 * Also used client-side to show warnings.
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = supabase as any

    // Must be a squad leader
    const { data: squad } = await s
      .from('squads')
      .select(`
        id, name, leader_id, disbanded_at,
        squad_members!squad_id(id, user_id, last_active_at, removed_at,
          profiles(display_name, handle))
      `)
      .eq('leader_id', user.id)
      .is('disbanded_at', null)
      .maybeSingle()

    if (!squad) return NextResponse.json({ error: 'No squad found' }, { status: 404 })

    const now = Date.now()
    const MS_DAY = 1000 * 3600 * 24

    // ── Leader inactivity check ───────────────────────────────────────────────
    const { data: leaderLogs } = await s
      .from('training_logs')
      .select('logged_at')
      .eq('user_id', user.id)
      .order('logged_at', { ascending: false })
      .limit(1)

    const leaderLastLog  = leaderLogs?.[0]?.logged_at
    const leaderInactiveDays = leaderLastLog
      ? Math.floor((now - new Date(leaderLastLog).getTime()) / MS_DAY)
      : null

    // 6-month disband (182 days)
    if (leaderInactiveDays !== null && leaderInactiveDays >= 182) {
      // Disband the squad
      await s.from('squads').update({ disbanded_at: new Date().toISOString() }).eq('id', squad.id)
      // Strip leader flag
      await s.from('profiles').update({ is_split_leader: false }).eq('id', user.id)
      return NextResponse.json({
        disbanded: true,
        reason: `Squad disbanded after ${leaderInactiveDays} days of leader inactivity.`,
      })
    }

    // ── Member inactivity check ───────────────────────────────────────────────
    const activeMembers = (squad.squad_members ?? []).filter(
      (m: { removed_at: string | null }) => !m.removed_at
    )

    const inactiveMembers = activeMembers
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((m: any) => {
        const daysSince = Math.floor((now - new Date(m.last_active_at).getTime()) / MS_DAY)
        return { ...m, daysSinceActive: daysSince }
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((m: any) => m.daysSinceActive >= 45)

    return NextResponse.json({
      disbanded:           false,
      leaderInactiveDays:  leaderInactiveDays ?? 0,
      leaderWarning:       leaderInactiveDays !== null && leaderInactiveDays >= 150, // 5 months
      inactiveMembers:     inactiveMembers.map((m: {
        user_id: string
        daysSinceActive: number
        profiles: { display_name: string | null; handle: string | null }
      }) => ({
        user_id:         m.user_id,
        daysSinceActive: m.daysSinceActive,
        display_name:    m.profiles?.display_name ?? m.profiles?.handle ?? 'Runner',
      })),
    })
  } catch (err) {
    console.error('Inactivity check error:', err)
    return NextResponse.json({ error: 'Failed to check inactivity' }, { status: 500 })
  }
}
