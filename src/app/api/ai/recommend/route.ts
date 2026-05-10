import * as Sentry from '@sentry/nextjs'
import { serverConfig } from '@/lib/config'
import { NextResponse } from 'next/server'
import { AiRecommendSchema, zodError } from '@/lib/schemas'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { checkAndIncrementAIUsage } from '@/lib/aiRateLimit'

const anthropic = new Anthropic({ apiKey: serverConfig.anthropicApiKey })

const SLUG_LABELS: Record<string, string> = {
  '5k_couch_to_5k': 'Couch to 5K', '5k_improve': '5K Improver', '5k_performance': '5K Performance',
  '10k_beginner': '10K Beginner', '10k_intermediate': '10K Intermediate', '10k_performance': '10K Performance',
  '10mi_beginner': '10 Mile Beginner', '10mi_intermediate': '10 Mile Intermediate', '10mi_performance': '10 Mile Performance',
  'half_novice': 'Half Marathon Novice', 'half_intermediate': 'Half Marathon Intermediate', 'half_performance': 'Half Marathon Performance',
  'marathon_novice': 'Marathon Novice', 'marathon_intermediate': 'Marathon Intermediate', 'marathon_performance': 'Marathon Performance',
  'ultra_50mi': '50-Mile Ultra', 'ultra_100mi': '100-Mile Ultra',
}

export async function POST(req: Request) {
  // Auth check — must be logged in
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  // S6: rate-limit guard — was unguarded; any authenticated user could drain Anthropic quota.
  const rateCheck = await checkAndIncrementAIUsage(user.id)
  if (!rateCheck.allowed) {
    return NextResponse.json({ error: rateCheck.reason, rateLimited: true }, { status: 429 })
  }

  try {
    const parsed = AiRecommendSchema.safeParse(await req.json())
    if (!parsed.success) return zodError(parsed.error)
    const body = parsed.data
    const { experience, goal, weeksAvailable, daysPerWeek } = body

    const prompt = `You are a running coach helping a runner pick the best training plan.

Runner profile:
- Experience level: ${experience}
- Goal: ${goal}
- Weeks available: ${weeksAvailable}
- Training days per week: ${daysPerWeek}

Available plans: ${Object.entries(SLUG_LABELS).map(([slug, name]) => `${slug}: ${name}`).join(', ')}

Recommend the single best plan slug for this runner. Respond with JSON only:
{"slug": "plan_slug", "reason": "one sentence explanation"}`

    const message = await anthropic.messages.create({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 200,
      messages:   [{ role: 'user', content: prompt }],
    })

    const raw     = message.content[0].type === 'text' ? message.content[0].text : '{}'
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const result  = JSON.parse(cleaned)

    return NextResponse.json(result)
  } catch (err) {
    Sentry.captureException(err, { extra: { context: 'recommend error:' } })
    return NextResponse.json({ error: 'Recommendation failed' }, { status: 500 })
  }
}
