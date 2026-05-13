import * as Sentry from '@sentry/nextjs'
import { serverConfig } from '@/lib/config'
import { NextResponse } from 'next/server'
import { AiCoachSchema, zodError } from '@/lib/schemas'
import { createClient } from '@/lib/supabase/server'
import { getServerSubscription, requirePro } from '@/lib/serverSubscription'
import Anthropic from '@anthropic-ai/sdk'
import { checkAndIncrementAIUsage, recordTokenUsage } from '@/lib/aiRateLimit'
import { db } from '@/lib/supabase/db'
import { secsToMMSS } from '@/lib/sessionUtils'

const anthropic = new Anthropic({ apiKey: serverConfig.anthropicApiKey })

// PR J2 — prompt caching. The role + style guide is identical across all
// modes (insight / weekly / patterns) and stable across calls; the
// athlete-context block is stable within a session (same plan, same recent
// weeks). Both are sent as cached system blocks; only the mode-specific
// ask travels as the user message.
const SYSTEM_PROMPT = `You are a world-class running coach. Give concise,
personalised coaching. Reference the athlete's actual numbers from the
context block. Be encouraging but honest. No generic advice, no fluff,
no headers or markdown.

When asked for an INSIGHT: 4-6 sentences. Give ONE clear action for this
week. Reference real data.

When asked for a WEEKLY summary: 6-8 sentences covering what went well,
what needs attention, load trend, one specific recommendation for next
week. End with a motivational sentence tied to their race timeline.

When asked for PATTERNS: 3 bullet points (one sentence each — a strength,
a warning, an underrated area), then a 2-sentence overall assessment.`

function paceToSecs(pace: string): number {
  const parts = pace.split(':')
  if (parts.length !== 2) return 0
  return parseInt(parts[0]) * 60 + parseInt(parts[1])
}

export async function POST(req: Request) {
  if (!serverConfig.anthropicApiKey) {
    return NextResponse.json({ error: 'AI coaching not configured' }, { status: 503 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  // ── Rate limit check ────────────────────────────────────────────────────────
  const rateCheck = await checkAndIncrementAIUsage(user.id, 'ai_coach')
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: rateCheck.reason, rateLimited: true, limit: rateCheck.limit },
      { status: 429 }
    )
  }

  const parsed = AiCoachSchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return zodError(parsed.error)
  const body = parsed.data
  const mode = body.mode ?? 'insight'

  // ── Fetch plan ──────────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: planData } = await db(supabase)
    .from('user_plans').select('*').eq('user_id', user.id)
    .eq('status', 'active').maybeSingle()

  if (!planData) return NextResponse.json({ error: 'No active plan' }, { status: 404 })

  // ── Fetch last 4 weeks of logs ──────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: logsData } = await db(supabase)
    .from('training_logs').select('*').eq('plan_id', planData.id)
    .order('week_n', { ascending: false }).limit(60)

  const logs = (logsData ?? []) as Array<{
    week_n: number; day_i: number; session_i: number
    done: boolean; effort: number | null; km: number | null
    pace: string | null; notes: string | null; logged_at: string
  }>

  interface PlanWeekData {
    n: number; title: string; b: string; kl: [number, number]; note: string
    days: Array<{ sessions: Array<{ c: string; n: string; km: number }> }>
  }
  const weeks = (planData.weeks_data as PlanWeekData[]) ?? []
  const currentWeekN = planData.current_week
  const currentWeek = weeks.find((w: PlanWeekData) => w.n === currentWeekN)

  interface WeekSummary {
    week: number; sessions_done: number; sessions_planned: number
    km_logged: number; km_planned: number; avg_effort: number | null; avg_pace: string | null
  }
  const recentWeeks = weeks.filter((w: PlanWeekData) => w.n >= currentWeekN - 3 && w.n <= currentWeekN)
  const weekSummaries: WeekSummary[] = recentWeeks.map((w: PlanWeekData) => {
    const weekLogs = logs.filter(l => l.week_n === w.n && l.done)
    const planned = w.days.reduce((a, d) => a + d.sessions.length, 0)
    const kmLogged = weekLogs.reduce((a, l) => a + (l.km ?? 0), 0)
    const efforts = weekLogs.filter(l => l.effort).map(l => l.effort!)
    const avgEffort = efforts.length ? Math.round(efforts.reduce((a, b) => a + b) / efforts.length * 10) / 10 : null
    const paces = weekLogs.filter(l => l.pace).map(l => paceToSecs(l.pace!)).filter(Boolean)
    const avgPaceSecs = paces.length ? Math.round(paces.reduce((a, b) => a + b) / paces.length) : null
    return {
      week: w.n, sessions_done: weekLogs.length, sessions_planned: planned,
      km_logged: Math.round(kmLogged * 10) / 10, km_planned: w.kl[0],
      avg_effort: avgEffort, avg_pace: avgPaceSecs ? secsToMMSS(avgPaceSecs) : null,
    }
  })

  const kmByWeek: Record<number, number> = {}
  for (const log of logs) {
    if (log.done && log.km) kmByWeek[log.week_n] = (kmByWeek[log.week_n] ?? 0) + log.km
  }
  const acute = kmByWeek[currentWeekN] ?? 0
  const chronicWeeks = [currentWeekN - 3, currentWeekN - 2, currentWeekN - 1, currentWeekN]
  const chronic = chronicWeeks.reduce((a, w) => a + (kmByWeek[w] ?? 0), 0) / 4
  const acwr = chronic > 0 ? Math.round((acute / chronic) * 100) / 100 : null

  const todayStr = new Date().toISOString().split('T')[0]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: wellnessData } = await db(supabase)
    .from('wellness_logs').select('sleep, soreness, mood, log_date')
    .eq('user_id', user.id).eq('log_type', 'daily')
    .gte('log_date', new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0])
    .order('log_date', { ascending: false }).limit(7)

  const recentWellness = (wellnessData ?? []) as Array<{ sleep: number|null; soreness: number|null; mood: number|null; log_date: string }>
  const todayWellness = recentWellness.find(w => w.log_date === todayStr)

  // ── Fetch gym logs for current plan ────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: gymLogsData } = await db(supabase)
    .from('gym_logs')
    .select('week_n, day_i, session_i, exercises')
    .eq('plan_id', planData.id)
    .order('week_n', { ascending: false })
    .limit(30)

  const gymLogs = (gymLogsData ?? []) as Array<{ week_n: number; day_i: number; session_i: number; exercises: unknown[] }>

  // Count planned gym sessions per week from weeks_data
  const gymPlannedByWeek: Record<number, number> = {}
  const gymDoneByWeek: Record<number, number> = {}
  for (const w of weeks) {
    const gymSessions = w.days.flatMap((d: { sessions: Array<{ c: string }> }) =>
      d.sessions.filter((s: { c: string }) => s?.c?.startsWith('gym'))
    ).length
    gymPlannedByWeek[w.n] = gymSessions
    gymDoneByWeek[w.n] = gymLogs.filter(g => g.week_n === w.n).length
  }

  const recentNotes = logs.filter(l => l.notes && l.done && l.session_i !== 99).slice(0, 5)
    .map(l => `Week ${l.week_n}: "${l.notes}"`)

  // Ad-hoc sessions this week (session_i === 99)
  const adHocThisWeek = logs.filter(l => l.done && l.session_i === 99 && l.week_n === currentWeekN)
  const adHocNotes = adHocThisWeek
    .filter(l => l.notes)
    .map(l => l.notes!)
    .join(', ')

  const raceDate = planData.race_date
  const daysToRace = raceDate
    ? Math.ceil((new Date(raceDate).getTime() - Date.now()) / 86_400_000)
    : null

  // Current week gym status
  const gymPlannedThisWeek = gymPlannedByWeek[currentWeekN] ?? 0
  const gymDoneThisWeek = gymDoneByWeek[currentWeekN] ?? 0

  const context = `
ATHLETE PROFILE:
- Plan: ${planData.name}
- Current week: ${currentWeekN} of ${planData.total_weeks}
- Race date: ${raceDate ?? 'not set'}${daysToRace ? ` (${daysToRace} days away)` : ''}
- Week focus: ${currentWeek?.title ?? 'unknown'} (${currentWeek?.b === 'd' ? 'deload' : currentWeek?.b === 'r' ? 'race week' : 'build'})
- ACWR: ${acwr ?? 'insufficient data'}${acwr ? (acwr > 1.3 ? ' ⚠️ HIGH' : acwr < 0.8 ? ' ⚠️ LOW' : ' ✅ GOOD') : ''}
${gymPlannedThisWeek > 0 ? `- Strength sessions this week: ${gymDoneThisWeek}/${gymPlannedThisWeek} completed` : ''}
${adHocThisWeek.length > 0 ? `- Extra sessions this week: ${adHocThisWeek.length} (${adHocNotes || 'unplanned work'})` : ''}
${todayWellness ? `- Today's readiness: sleep ${todayWellness.sleep}/5, soreness ${todayWellness.soreness}/5, mood ${todayWellness.mood}/5` : ''}

LAST 4 WEEKS:
${weekSummaries.map(w =>
  `Week ${w.week}: ${w.sessions_done}/${w.sessions_planned} sessions, ${w.km_logged}/${w.km_planned}km` +
  (w.avg_effort ? `, RPE ${w.avg_effort}/10` : '') +
  (w.avg_pace ? `, ${w.avg_pace}/km avg` : '') +
  (gymPlannedByWeek[w.week] ? `, gym ${gymDoneByWeek[w.week] ?? 0}/${gymPlannedByWeek[w.week]}` : '')
).join('\n')}

${recentNotes.length ? `ATHLETE NOTES:\n${recentNotes.join('\n')}` : ''}
`.trim()

  const userAsk: Record<string, string> = {
    insight:  'Give an INSIGHT for this athlete.',
    weekly:   'Give a WEEKLY summary for this athlete.',
    patterns: 'Identify training PATTERNS for this athlete.',
  }

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 400,
      system: [
        { type: 'text', text: SYSTEM_PROMPT,                        cache_control: { type: 'ephemeral' } },
        { type: 'text', text: `ATHLETE CONTEXT:\n${context}`,        cache_control: { type: 'ephemeral' } },
      ],
      messages: [{ role: 'user', content: userAsk[mode] ?? userAsk.insight }],
    })

    const text = message.content
      .filter(b => b.type === 'text')
      .map(b => (b as { type: 'text'; text: string }).text)
      .join('')

    // PR J2 — record cache tokens for the AI cost dashboard.
    const usage = message.usage as typeof message.usage & {
      cache_read_input_tokens?:     number
      cache_creation_input_tokens?: number
    }
    await recordTokenUsage(
      user.id,
      usage.input_tokens,
      usage.output_tokens,
      'ai_coach',
      usage.cache_read_input_tokens     ?? 0,
      usage.cache_creation_input_tokens ?? 0,
    )

    return NextResponse.json({ note: text, context: { acwr, weekSummaries, currentWeekN } })
  } catch (err) {
    Sentry.captureException(err, { extra: { context: 'Claude API error:' } })
    return NextResponse.json({ error: 'AI coaching temporarily unavailable' }, { status: 503 })
  }
}
