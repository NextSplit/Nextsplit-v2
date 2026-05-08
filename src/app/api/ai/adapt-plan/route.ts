import * as Sentry from '@sentry/nextjs'
import { serverConfig } from '@/lib/config'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/supabase/db'
import Anthropic from '@anthropic-ai/sdk'
import type { PlanWeek, TrainingLog } from '@/types/database'
import { AdaptPlanSchema, zodError } from '@/lib/schemas'
import { checkAndIncrementAIUsage } from '@/lib/aiRateLimit'

const anthropic = new Anthropic({ apiKey: serverConfig.anthropicApiKey })

export async function POST(req: NextRequest) {
  try {
    if (!serverConfig.anthropicApiKey) {
      return NextResponse.json({ error: 'AI not configured' }, { status: 503 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    // S6: rate-limit guard — was unguarded; any authenticated user could drain Anthropic quota.
    const rateCheck = await checkAndIncrementAIUsage(user.id, 'free')
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: rateCheck.reason, rateLimited: true }, { status: 429 })
    }

    const parsed = AdaptPlanSchema.safeParse(await req.json())
    if (!parsed.success) return zodError(parsed.error)
    const { plan_id, week_n, missed_day_indices } = parsed.data

    // Fetch plan
    const { data: plan } = await db(supabase)
      .from('user_plans')
      .select('id, name, weeks_data, current_week, total_weeks, race_date')
      .eq('id', plan_id)
      .eq('user_id', user.id)
      .single()

    if (!plan) return NextResponse.json({ error: 'Plan not found' }, { status: 404 })

    const weeks     = plan.weeks_data as PlanWeek[]
    const weekData  = weeks.find((w: PlanWeek) => w.n === week_n)
    if (!weekData) return NextResponse.json({ error: 'Week not found' }, { status: 404 })

    // Fetch what was actually logged this week
    const { data: logs } = await db(supabase)
      .from('training_logs')
      .select('day_i, session_i, done, km, effort, pace')
      .eq('user_id', user.id)
      .eq('plan_id', plan_id)
      .eq('week_n', week_n)

    const logMap = Object.fromEntries(
      (logs ?? []).map((l: TrainingLog) => [`${l.day_i}_${l.session_i}`, l])
    )

    const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    const today = new Date().getDay()
    const todayPlanIndex = today === 0 ? 6 : today - 1

    // Build summary of what's done vs missed
    const sessionSummary = weekData.days.flatMap((day: { sessions: { c: string; n: string; km: number }[] }, dayI: number) =>
      day.sessions.map((sess: { c: string; n: string; km: number }, sessI: number) => {
        const log = logMap[`${dayI}_${sessI}`]
        const status = log?.done ? 'done' : dayI < todayPlanIndex ? 'missed' : 'upcoming'
        return `${DAYS[dayI]}: ${sess.n} (${sess.c}, ${sess.km}km) — ${status}${log?.effort ? `, effort ${log.effort}/10` : ''}`
      })
    ).join('\n')

    const prompt = `You are an expert running coach. An athlete has missed some sessions this week and needs their remaining schedule adapted.

PLAN: ${plan.name}, Week ${week_n}/${plan.total_weeks}${plan.race_date ? `, Race: ${plan.race_date}` : ''}

THIS WEEK'S SESSIONS:
${sessionSummary}

TODAY IS: ${DAYS[todayPlanIndex]}
REMAINING DAYS: ${DAYS.slice(todayPlanIndex + 1).join(', ') || 'none (end of week)'}

ADAPTATION RULES:
1. Never skip long runs — redistribute if needed
2. Reduce total weekly volume by at most 20% from missed sessions
3. Maintain the quality/easy balance (don't add extra hard sessions)
4. If < 2 days remain, suggest carrying key sessions into next week
5. Be specific about paces and distances

Respond with ONLY a JSON object (no markdown) with this structure:
{
  "recommendation": "2-3 sentences explaining what happened and the adaptation strategy",
  "adapted_days": [
    {
      "day": "Wednesday",
      "day_index": 2,
      "sessions": [
        {
          "c": "run-easy",
          "n": "Easy recovery run",
          "det": "35 min easy at 5:45-6:00/km. Keep HR conversational.",
          "km": 6
        }
      ]
    }
  ],
  "carry_forward": ["session name to do next week if applicable"],
  "key_message": "One line the athlete should remember this week"
}`

    const message = await anthropic.messages.create({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 800,
      messages:   [{ role: 'user', content: prompt }],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text : '{}'
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

    let adaptation
    try {
      adaptation = JSON.parse(cleaned)
    } catch {
      return NextResponse.json({ error: 'Failed to parse AI response', raw }, { status: 500 })
    }

    return NextResponse.json({ success: true, adaptation, week_n })

  } catch (err) {
    Sentry.captureException(err, { extra: { context: 'Adapt plan error:' } })
    return NextResponse.json({ error: 'Adaptation failed' }, { status: 500 })
  }
}
