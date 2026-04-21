import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/supabase/db'
import { computeRunnerClass, isClassRevealReady } from '@/lib/rpg'
import type { TrainingLog } from '@/types/database'

/**
 * POST /api/runner-class
 * Recomputes the runner class for the current user from their training logs.
 * Called:
 *  - After every session log (fire-and-forget from TodayClient)
 *  - On Character tab mount (to catch up after data changes)
 * Returns: { runnerClass, revealed, changed }
 */
export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    // Fetch all training logs for this user
    const { data: rawLogs, error: logsErr } = await db(supabase)
      .from('training_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('done', true)
      .order('logged_at', { ascending: true })

    if (logsErr) return NextResponse.json({ error: logsErr.message }, { status: 500 })

    const logs = (rawLogs ?? []) as TrainingLog[]

    // Fetch active plan weeks for session type mapping
    const { data: planData } = await db(supabase)
      .from('user_plans')
      .select('weeks_data')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle()

    // Build session type map from plan weeks
    const sessionTypeMap = new Map<string, string>()
    if (planData?.weeks_data) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const weeks = planData.weeks_data as any[]
      for (const week of weeks) {
        for (let di = 0; di < (week.days ?? []).length; di++) {
          for (let si = 0; si < (week.days[di]?.sessions ?? []).length; si++) {
            sessionTypeMap.set(`${week.n}_${di}_${si}`, week.days[di].sessions[si].c)
          }
        }
      }
    }

    // Fetch current profile
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (supabase as any)
      .from('profiles')
      .select('runner_class, runner_class_revealed, first_session_logged_at')
      .eq('id', user.id)
      .single()

    // Track first session ever
    const firstSessionAt = profile?.first_session_logged_at ??
      (logs.length > 0 ? logs[0].logged_at : null)

    // If first_session_logged_at not yet set, write it now
    if (!profile?.first_session_logged_at && firstSessionAt) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('profiles')
        .update({ first_session_logged_at: firstSessionAt })
        .eq('id', user.id)
    }

    // Compute new class
    const newClass = computeRunnerClass({
      logs,
      sessionTypeMap,
      firstSessionAt,
    })

    const revealReady = isClassRevealReady(logs, firstSessionAt)
    const prevClass = profile?.runner_class ?? 'warming_up'
    const alreadyRevealed = profile?.runner_class_revealed ?? false
    const changed = newClass !== prevClass

    // Update profile if class changed or reveal status changed
    const shouldUpdate = changed || (revealReady && !alreadyRevealed)
    if (shouldUpdate) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('profiles')
        .update({
          runner_class: newClass,
          runner_class_updated_at: new Date().toISOString(),
          // Only flip revealed to true — never back to false
          ...(revealReady && !alreadyRevealed ? { runner_class_revealed: true } : {}),
        })
        .eq('id', user.id)
    }

    return NextResponse.json({
      runnerClass: newClass,
      revealReady,
      revealed: revealReady,
      changed,
      prevClass,
    })

  } catch (err) {
    console.error('Runner class compute error:', err)
    return NextResponse.json({ error: 'Failed to compute class' }, { status: 500 })
  }
}
