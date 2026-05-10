import * as Sentry from '@sentry/nextjs'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { config, serverConfig } from '@/lib/config'
import { coachPush } from '@/lib/coach-push'

// BL-C4 — Coach-Pro Monday digest fan-out.
//
// Runs idempotently per-coach per ISO-week:
//   1. Compute current ISO-week period (e.g. '2026-W19')
//   2. For each Coach-Pro coach (`coach_profiles.is_coach_pro = true`):
//      a. Try to INSERT coach_digest_runs row — UNIQUE (coach_id, period) is
//         the lock. Conflict ⇒ digest already ran this week, skip.
//      b. Aggregate per-athlete signals over the past 7 days
//      c. Push notification + in-app notification with summary line
//      d. Persist digest_payload + athlete_count for audit
//
// Cache: the digest_payload JSON is the cache. Coaches can re-read past
// digests without recomputing. (UI surface for that lives in /coach
// dashboard — out of scope for this PR.)
//
// Scope guard: Coach-Pro only. Free coaches don't get the digest by design
// — it's part of the £29/mo Coach-Pro feature set per HANDOFF.

interface CoachRow {
  user_id: string
  display_name: string | null
}

interface AthleteSummary {
  athlete_id:    string
  display_name:  string
  sessions_done: number
  sessions_planned: number
  total_km:      number
  missed_count:  number
  flag:          'on_track' | 'behind' | 'silent' | 'no_plan'
}

interface DigestPayload {
  coach_id:      string
  period:        string
  generated_at:  string
  athletes:      AthleteSummary[]
  headline:      string  // one-liner used as push body
}

// ISO week — Monday-anchored (matches Europe/UK conventions). Returns
// 'YYYY-Www'. Week 1 is the week containing the first Thursday of the year
// (ISO-8601). Native Date math here keeps the helper free of dayjs/luxon.
export function isoWeekPeriod(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  // Set to Thursday in current week
  const day = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - day)
  const year = d.getUTCFullYear()
  const yearStart = new Date(Date.UTC(year, 0, 1))
  const week = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return `${year}-W${String(week).padStart(2, '0')}`
}

function classify(s: { sessions_done: number; sessions_planned: number; missed_count: number }): AthleteSummary['flag'] {
  if (s.sessions_planned === 0) return 'no_plan'
  if (s.sessions_done === 0)    return 'silent'
  if (s.missed_count >= 2)      return 'behind'
  return 'on_track'
}

function buildHeadline(athletes: AthleteSummary[]): string {
  const total = athletes.length
  if (total === 0) return 'No active athletes this week.'
  const behind = athletes.filter(a => a.flag === 'behind' || a.flag === 'silent').length
  const onTrack = athletes.filter(a => a.flag === 'on_track').length
  if (behind === 0) return `${onTrack}/${total} athletes on track this week. Nice.`
  if (behind === 1) return `${onTrack}/${total} on track · 1 needs a check-in.`
  return `${onTrack}/${total} on track · ${behind} need a check-in.`
}

export async function runMondayDigest(): Promise<{ coaches_processed: number; coaches_skipped: number }> {
  const admin = createAdminClient(config.supabaseUrl, serverConfig.supabaseServiceRoleKey)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const a = admin as any

  const period   = isoWeekPeriod()
  const weekAgo  = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()

  let processed = 0
  let skipped   = 0

  try {
    const { data: coaches } = await a
      .from('coach_profiles')
      .select('user_id, display_name')
      .eq('is_coach_pro', true)
      .limit(500)

    if (!coaches?.length) return { coaches_processed: 0, coaches_skipped: 0 }

    for (const coachRow of coaches as CoachRow[]) {
      const coachId = coachRow.user_id

      // Idempotency lock — INSERT and rely on UNIQUE conflict to detect
      // re-runs. We update the payload after computing it; a duplicate-key
      // error here means the digest already shipped for this period.
      const { error: lockErr } = await a
        .from('coach_digest_runs')
        .insert({
          coach_id:        coachId,
          period,
          athlete_count:   0,
          digest_payload:  null,
        })

      if (lockErr) {
        // 23505 = unique_violation — expected on re-runs within the same week
        if ((lockErr as { code?: string }).code === '23505') {
          skipped++
          continue
        }
        Sentry.captureException(lockErr, {
          tags:  { feature: 'blc4-monday-digest' },
          extra: { context: '[runMondayDigest lock]', coachId, period },
        })
        continue
      }

      // Pull active athletes for this coach.
      const { data: rels } = await a
        .from('coach_athletes')
        .select('athlete_id')
        .eq('coach_id', coachId)
        .eq('status', 'active')

      const athleteIds: string[] = (rels ?? []).map((r: { athlete_id: string }) => r.athlete_id)

      const summaries: AthleteSummary[] = []
      if (athleteIds.length > 0) {
        // Bulk fetch profiles + last-7-day logs + active plans in one round-trip each.
        const [profilesRes, logsRes, plansRes] = await Promise.all([
          a.from('profiles').select('id, display_name, handle').in('id', athleteIds),
          a.from('training_logs')
            .select('user_id, done, km')
            .in('user_id', athleteIds)
            .gte('logged_at', weekAgo),
          a.from('user_plans')
            .select('user_id, weeks_data, current_week')
            .in('user_id', athleteIds)
            .eq('status', 'active'),
        ])

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const profilesById = new Map<string, any>((profilesRes.data ?? []).map((p: any) => [p.id, p]))
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const logsByUser = new Map<string, any[]>()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const l of (logsRes.data ?? []) as any[]) {
          const arr = logsByUser.get(l.user_id) ?? []
          arr.push(l)
          logsByUser.set(l.user_id, arr)
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const planByUser = new Map<string, any>()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const p of (plansRes.data ?? []) as any[]) {
          planByUser.set(p.user_id, p)
        }

        for (const id of athleteIds) {
          const profile = profilesById.get(id)
          const logs    = logsByUser.get(id) ?? []
          const plan    = planByUser.get(id)

          const done    = logs.filter((l: { done: boolean }) => l.done)
          const totalKm = done.reduce((sum: number, l: { km: number | null }) => sum + (l.km ?? 0), 0)

          // Approximate planned-sessions count for the current week from
          // weeks_data. Falls back to 0 when no plan / weeks_data malformed.
          let plannedThisWeek = 0
          try {
            const weeks = plan?.weeks_data
            const cw    = Array.isArray(weeks) ? weeks.find((w: { n: number }) => w.n === plan.current_week) : null
            if (cw?.days) {
              for (const d of cw.days as Array<{ sessions: Array<{ c?: string }> }>) {
                for (const s of d.sessions ?? []) {
                  if (s.c && s.c !== 'rest') plannedThisWeek++
                }
              }
            }
          } catch { /* ignore malformed plan rows */ }

          const missed = Math.max(0, plannedThisWeek - done.length)
          const flag   = classify({ sessions_done: done.length, sessions_planned: plannedThisWeek, missed_count: missed })

          summaries.push({
            athlete_id:       id,
            display_name:     profile?.display_name ?? profile?.handle ?? 'Athlete',
            sessions_done:    done.length,
            sessions_planned: plannedThisWeek,
            total_km:         Math.round(totalKm),
            missed_count:     missed,
            flag,
          })
        }
      }

      const headline: string = buildHeadline(summaries)
      const payload: DigestPayload = {
        coach_id:     coachId,
        period,
        generated_at: new Date().toISOString(),
        athletes:     summaries,
        headline,
      }

      // Persist the cached payload. Update on the lock row we already created.
      await a
        .from('coach_digest_runs')
        .update({
          athlete_count:  summaries.length,
          digest_payload: payload,
        })
        .eq('coach_id', coachId)
        .eq('period', period)

      // Fan-out — push + in-app. Same coachPush helper used by BL-C2/BL-C3
      // so the feature tag flows into the BL-X8 alert rule.
      await coachPush({
        recipientId:    coachId,
        title:          `Monday digest · ${summaries.length} athletes`,
        body:           headline,
        destinationUrl: '/coach',
        type:           'coach_monday_digest',
        data:           { period, athlete_count: String(summaries.length) },
        feature:        'blc4-monday-digest',
      })

      processed++
    }
  } catch (err) {
    Sentry.captureException(err, {
      tags:  { feature: 'blc4-monday-digest' },
      extra: { context: '[runMondayDigest top-level]' },
    })
  }

  return { coaches_processed: processed, coaches_skipped: skipped }
}
