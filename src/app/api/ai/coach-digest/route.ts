import * as Sentry from '@sentry/nextjs'
import { serverConfig } from '@/lib/config'
import { NextRequest, NextResponse } from 'next/server'
import { AiCoachDigestSchema, zodError } from '@/lib/schemas'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/supabase/db'
import Anthropic from '@anthropic-ai/sdk'
import { checkAndIncrementAIUsage, recordTokenUsage } from '@/lib/aiRateLimit'
import { requireCoachPro } from '@/lib/server/requireCoachPro'

const anthropic = new Anthropic({ apiKey: serverConfig.anthropicApiKey })

// PR J2 — prompt caching. System framing is stable across all coaches +
// all athletes; ephemeral cache cuts repeat-call input cost ~10x.
const SYSTEM_PROMPT = `You are an AI assistant briefing a running coach
about one of their athletes. Generate a concise weekly coaching digest.

Structure (always):
1. Summarise training adherence and load (1 sentence).
2. Note any wellness concerns (1 sentence).
3. Give 1-2 specific coaching recommendations for next week.
4. Flag anything the coach should act on urgently (if anything).

Be direct and actionable. Write as if briefing the coach. No fluff,
no markdown, no greeting, no sign-off. 3-4 sentences total.`

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    // OQ#2 = C — AI digest is Coach-Pro only. Free Split Leaders see the
    // upgrade prompt instead of the digest button on /coach/athlete/[id].
    const gate = await requireCoachPro(supabase, user.id, 'ai_digest')
    if (gate) return gate

    // S6: rate-limit guard — was unguarded; any authenticated user could drain Anthropic quota.
    const rateCheck = await checkAndIncrementAIUsage(user.id, 'ai_coach_digest')
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: rateCheck.reason, rateLimited: true }, { status: 429 })
    }

    const parsed = AiCoachDigestSchema.safeParse(await req.json())
    if (!parsed.success) return zodError(parsed.error)
    const { athlete_id } = parsed.data
    if (!athlete_id) return NextResponse.json({ error: 'athlete_id required' }, { status: 400 })

    // Verify coach-athlete relationship
    const { data: rel } = await db(supabase)
      .from('coach_athletes')
      .select('share_logs, share_wellness')
      .eq('coach_id', user.id)
      .eq('athlete_id', athlete_id)
      .eq('status', 'active')
      .maybeSingle()

    if (!rel) return NextResponse.json({ error: 'No active relationship' }, { status: 403 })

    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString()

    // Fetch athlete data
    const [profileRes, logsRes, wellnessRes, planRes] = await Promise.all([
      db(supabase).from('profiles').select('display_name, age, running_experience, weekly_km_current').eq('id', athlete_id).single(),
      rel.share_logs ? db(supabase).from('training_logs').select('done, km, pace, effort, duration_secs, logged_at').eq('user_id', athlete_id).gte('logged_at', twoWeeksAgo).order('logged_at', { ascending: false }) : Promise.resolve({ data: [] }),
      rel.share_wellness ? db(supabase).from('wellness_logs').select('log_date, sleep, energy, mood, soreness').eq('user_id', athlete_id).gte('log_date', twoWeeksAgo).order('log_date', { ascending: false }) : Promise.resolve({ data: [] }),
      db(supabase).from('user_plans').select('name, current_week, total_weeks, race_date').eq('user_id', athlete_id).eq('status', 'active').limit(1),
    ])

    const profile  = profileRes.data
    const logs     = logsRes.data ?? []
    const wellness = wellnessRes.data ?? []
    const plan     = planRes.data?.[0]

    // Compute quick stats
    const doneLogs   = logs.filter((l: { done: boolean }) => l.done)
    const totalKm    = doneLogs.reduce((a: number, l: { km: number | null }) => a + (l.km ?? 0), 0)
    const avgEffort  = doneLogs.length ? doneLogs.reduce((a: number, l: { effort: number | null }) => a + (l.effort ?? 5), 0) / doneLogs.length : null
    const avgSleep   = wellness.length ? wellness.reduce((a: number, w: { sleep: number | null }) => a + (w.sleep ?? 0), 0) / wellness.filter((w: { sleep: number | null }) => w.sleep).length : null
    const avgSoreness = wellness.length ? wellness.reduce((a: number, w: { soreness: number | null }) => a + (w.soreness ?? 0), 0) / wellness.filter((w: { soreness: number | null }) => w.soreness).length : null

    const athleteContext = `ATHLETE: ${profile?.display_name ?? 'Athlete'}
PLAN: ${plan ? `${plan.name} (Week ${plan.current_week}/${plan.total_weeks}${plan.race_date ? `, race: ${plan.race_date}` : ''})` : 'No active plan'}
EXPERIENCE: ${profile?.running_experience ?? 'unknown'}

LAST 2 WEEKS TRAINING:
- Sessions completed: ${doneLogs.length} of ${logs.length}
- Total km: ${Math.round(totalKm)}km
- Avg effort: ${avgEffort ? avgEffort.toFixed(1) : '—'}/10
- Missed sessions: ${logs.length - doneLogs.length}

WELLNESS (last 2 weeks):
- Avg sleep: ${avgSleep ? avgSleep.toFixed(1) : '—'}hrs
- Avg soreness: ${avgSoreness ? avgSoreness.toFixed(1) : '—'}/10`

    const message = await anthropic.messages.create({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 400,
      system: [
        { type: 'text', text: SYSTEM_PROMPT,   cache_control: { type: 'ephemeral' } },
        { type: 'text', text: athleteContext,  cache_control: { type: 'ephemeral' } },
      ],
      messages:   [{ role: 'user', content: 'Generate the coaching digest.' }],
    })

    const usage = message.usage as typeof message.usage & {
      cache_read_input_tokens?:     number
      cache_creation_input_tokens?: number
    }
    await recordTokenUsage(
      user.id,
      usage.input_tokens,
      usage.output_tokens,
      'ai_coach_digest',
      usage.cache_read_input_tokens     ?? 0,
      usage.cache_creation_input_tokens ?? 0,
    )

    const digest = message.content[0].type === 'text' ? message.content[0].text : ''

    return NextResponse.json({
      digest,
      stats: {
        sessions_done:  doneLogs.length,
        sessions_total: logs.length,
        total_km:       Math.round(totalKm),
        avg_effort:     avgEffort ? Math.round(avgEffort * 10) / 10 : null,
        avg_sleep:      avgSleep ? Math.round(avgSleep * 10) / 10 : null,
        avg_soreness:   avgSoreness ? Math.round(avgSoreness * 10) / 10 : null,
      },
    })

  } catch (err) {
    Sentry.captureException(err, { extra: { context: 'Coach digest error:' } })
    return NextResponse.json({ error: 'Digest generation failed' }, { status: 500 })
  }
}
