import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/supabase/db'
import Anthropic from '@anthropic-ai/sdk'
import { weeklyKm, calcACWR } from '@/lib/statsUtils'
import type { TrainingLog, PlanWeek } from '@/types/database'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST() {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'AI not configured' }, { status: 503 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    // Fetch last 4 weeks of training logs
    const fourWeeksAgo = new Date(Date.now() - 28 * 24 * 3600 * 1000).toISOString()

    const [logsRes, wellnessRes, planRes] = await Promise.all([
      db(supabase).from('training_logs')
        .select('week_n, day_i, session_i, done, km, pace, effort, duration_secs, logged_at')
        .eq('user_id', user.id)
        .gte('logged_at', fourWeeksAgo)
        .order('logged_at', { ascending: false }),
      db(supabase).from('wellness_logs')
        .select('log_date, sleep, energy, mood, soreness')
        .eq('user_id', user.id)
        .gte('log_date', fourWeeksAgo.slice(0, 10))
        .order('log_date', { ascending: false }),
      db(supabase).from('user_plans')
        .select('name, current_week, total_weeks, race_date, weeks_data')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .limit(1),
    ])

    const logs     = (logsRes.data ?? []) as TrainingLog[]
    const wellness = wellnessRes.data ?? []
    const plan     = planRes.data?.[0]

    // Compute key stats
    const doneLogs   = logs.filter(l => l.done)
    const totalKm    = doneLogs.reduce((a, l) => a + (l.km ?? 0), 0)
    const weekKm     = weeklyKm(doneLogs)
    const weeks      = plan?.weeks_data as PlanWeek[] | null

    // ACWR if we have weeks
    let currentAcwr: number | null = null
    if (weeks && logs.length > 0) {
      const acwrData = calcACWR(doneLogs, weeks)
      currentAcwr = acwrData[acwrData.length - 1]?.acwr ?? null
    }

    const avgEffort = doneLogs.filter(l => l.effort).length > 0
      ? doneLogs.filter(l => l.effort).reduce((a, l) => a + (l.effort ?? 0), 0) /
        doneLogs.filter(l => l.effort).length
      : null

    interface WellnessLog { sleep: number | null; soreness: number | null }
    const avgSleep = wellness.filter((w: WellnessLog) => w.sleep).length > 0
      ? wellness.filter((w: WellnessLog) => w.sleep).reduce((a: number, w: WellnessLog) => a + (w.sleep ?? 0), 0) /
        wellness.filter((w: WellnessLog) => w.sleep).length
      : null

    const avgSoreness = wellness.filter((w: WellnessLog) => w.soreness).length > 0
      ? wellness.filter((w: WellnessLog) => w.soreness).reduce((a: number, w: WellnessLog) => a + (w.soreness ?? 0), 0) /
        wellness.filter((w: WellnessLog) => w.soreness).length
      : null

    // Best recent pace (from runs with pace data)
    const paceRuns = doneLogs.filter(l => l.km && l.km >= 5 && l.pace).sort((a, b) => {
      const pa = a.pace!.split(':').map(Number); const pb = b.pace!.split(':').map(Number)
      return (pa[0] * 60 + pa[1]) - (pb[0] * 60 + pb[1])
    })
    const bestPace = paceRuns[0]?.pace ?? null

    const prompt = `You are an expert running coach giving a weekly debrief to an athlete. Be direct, specific, and coaching-focused — like a coach who knows the data deeply.

ATHLETE'S PLAN: ${plan ? `${plan.name} (Week ${plan.current_week}/${plan.total_weeks}${plan.race_date ? `, race: ${plan.race_date}` : ''})` : 'No active plan'}

LAST 4 WEEKS TRAINING DATA:
- Sessions completed: ${doneLogs.length} of ${logs.length} planned (${logs.length > 0 ? Math.round(doneLogs.length / logs.length * 100) : 0}%)
- Total km: ${Math.round(totalKm)}km
- Weekly km: ${Object.entries(weekKm).slice(-4).map(([w, k]) => `W${w}: ${Math.round(k)}km`).join(', ') || 'insufficient data'}
- ACWR (training load ratio): ${currentAcwr?.toFixed(2) ?? 'insufficient data'} ${currentAcwr ? (currentAcwr > 1.3 ? '⚠️ elevated' : currentAcwr < 0.8 ? '📉 low' : '✓ optimal') : ''}
- Avg effort: ${avgEffort ? `${avgEffort.toFixed(1)}/10` : '—'}
- Best recent pace: ${bestPace ?? '—'}

WELLNESS (last 4 weeks):
- Avg sleep: ${avgSleep ? `${avgSleep.toFixed(1)}hrs` : '—'}
- Avg soreness: ${avgSoreness ? `${avgSoreness.toFixed(1)}/10` : '—'}
- Mood/energy trends: ${wellness.length > 0 ? 'data available' : 'no check-ins logged'}

Write a coaching debrief in exactly this structure:

**This week in numbers**
One sentence summarising the training volume and adherence.

**What the data tells me**
2-3 sentences reading the patterns — what the ACWR, soreness, effort scores and km trends actually mean about the athlete's current state.

**One thing to focus on next week**
Specific, actionable. Not vague ("run more") — precise ("keep your easy runs below 5:45/km to build aerobic base without digging into recovery").

**Watch out for**
One brief flag if there's an injury risk, overtraining sign, or missed pattern. Skip this section if everything looks fine.

Keep the whole thing under 200 words. Sound like a coach, not a report.`

    const message = await anthropic.messages.create({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages:   [{ role: 'user', content: prompt }],
    })

    const summary = message.content[0].type === 'text' ? message.content[0].text : ''

    return NextResponse.json({
      summary,
      stats: {
        sessions_done:  doneLogs.length,
        sessions_total: logs.length,
        total_km:       Math.round(totalKm),
        acwr:           currentAcwr,
        avg_effort:     avgEffort ? Math.round(avgEffort * 10) / 10 : null,
        avg_sleep:      avgSleep ? Math.round(avgSleep * 10) / 10 : null,
        best_pace:      bestPace,
      },
    })

  } catch (err) {
    console.error('Weekly summary error:', err)
    return NextResponse.json({ error: 'Summary generation failed' }, { status: 500 })
  }
}
