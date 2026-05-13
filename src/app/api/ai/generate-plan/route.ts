import * as Sentry from '@sentry/nextjs'
import { serverConfig } from '@/lib/config'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { GeneratePlanSchema, zodError } from '@/lib/schemas'
import { checkAndIncrementAIUsage, recordTokenUsage } from '@/lib/aiRateLimit'
import { validateGeneratedPlan, type PlanDistance } from '@/lib/planValidator'

// S9 (audit): distance is needed for the taper-check; the prompt schema
// doesn't pass distance explicitly today, so we keyword-scan. False
// negatives here just skip the taper check — long-run ratio still runs
// regardless of distance.
function inferDistanceFromPrompt(prompt: string): PlanDistance {
  const p = prompt.toLowerCase()
  if (p.includes('marathon') && !p.includes('half')) return 'marathon'
  if (p.includes('half marathon') || p.includes('half_')) return 'half'
  if (p.includes('10 mile') || p.includes('10mi')) return '10mi'
  if (p.includes('10k') || p.includes('10 k')) return '10k'
  if (p.includes('5k') || p.includes('5 k') || p.includes('couch to 5')) return '5k'
  if (p.includes('100 mile') || p.includes('100mi')) return 'ultra_100mi'
  if (p.includes('50 mile') || p.includes('50mi') || p.includes('ultra')) return 'ultra_50mi'
  return 'unknown'
}

const anthropic = new Anthropic({ apiKey: serverConfig.anthropicApiKey })

// PR J2 — prompt caching. The output structure + coaching style guidance
// applies to every plan generation; cache it. The user-side prompt is
// free-form (different per runner goal), so only the system framing
// caches reliably.
const SYSTEM_PROMPT = `You are an expert running coach generating a
structured training plan as JSON.

Output a JSON object (no markdown, no extra text) with this shape:
{
  "name":        "Plan name",
  "totalWeeks":  number,
  "peakWeeklyKm": number,
  "weeks": [
    {
      "n":     1,
      "title": "Base building 1",
      "b":     "build" | "deload" | "race",
      "kl":    [minKm, maxKm],
      "note":  "Optional brief week note",
      "days":  [
        { "sessions": [{ "c": "run-easy", "n": "Easy 5km", "km": 5 }] }
      ]
    }
  ]
}

Coaching rules:
- Long runs grow gradually (max +20% per week).
- Include a taper for distance plans of 10mi and longer (10-30% volume cut
  in the final 1-3 weeks).
- Balance quality (intervals/tempo/threshold) with easy aerobic volume.
- Use codes from the canonical set: run-easy, run-long, run-tempo,
  run-int (intervals), run-mp (marathon pace), run-race, gym-strength,
  pilates, sauna, rest.
- Always be specific about paces/durations in the session "n" (name)
  and detail fields.`

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    // S6: rate-limit guard. Replaces a prior fire-and-forget upsert into
    // ai_usage that counted calls but never gated them — any authenticated
    // user could drain Anthropic quota. checkAndIncrementAIUsage upserts
    // on the same (user_id, date) row used elsewhere and returns 429 once
    // the daily cap is reached.
    const rateCheck = await checkAndIncrementAIUsage(user.id, 'ai_generate_plan')
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: rateCheck.reason, rateLimited: true }, { status: 429 })
    }

    const parsed = GeneratePlanSchema.safeParse(await req.json())
    if (!parsed.success) return zodError(parsed.error)
    const { prompt } = parsed.data

    const message = await anthropic.messages.create({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 8000,
      system: [
        { type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
      ],
      messages:   [{ role: 'user', content: prompt }],
    })

    const usage = message.usage as typeof message.usage & {
      cache_read_input_tokens?:     number
      cache_creation_input_tokens?: number
    }
    await recordTokenUsage(
      user.id,
      usage.input_tokens,
      usage.output_tokens,
      'ai_generate_plan',
      usage.cache_read_input_tokens     ?? 0,
      usage.cache_creation_input_tokens ?? 0,
    )

    const raw = message.content[0].type === 'text' ? message.content[0].text : ''

    // Strip markdown fences if present
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

    let plan
    try {
      plan = JSON.parse(cleaned)
    } catch {
      // If parsing fails return a fallback structure
      Sentry.captureException(new Error('Failed to parse AI plan JSON'), { extra: { preview: cleaned.slice(0, 200) } })
      plan = {
        name:        'My Training Plan',
        totalWeeks:  12,
        peakWeeklyKm: 50,
        weeks:       [],
      }
    }

    // S9 (audit) — advisory plan validation. Surfaces drift in AI output
    // (missing taper for marathon/half, oversized long runs) as Sentry
    // breadcrumbs without blocking the response. Iterate the prompt when
    // these alerts get noisy.
    try {
      const distance = inferDistanceFromPrompt(prompt)
      const result = validateGeneratedPlan(plan, distance)
      if (!result.valid) {
        Sentry.captureMessage('plan-validator: AI output flagged', {
          level: 'warning',
          tags: { feature: 'plan-validator', distance },
          extra: { issues: result.issues, weekCount: plan?.weeks?.length ?? 0 },
        })
      }
    } catch { /* validator throws should never block the response */ }

    return NextResponse.json(plan)

  } catch (err) {
    Sentry.captureException(err, { extra: { context: 'generate-plan error:' } })
    return NextResponse.json({ error: 'Plan generation failed' }, { status: 500 })
  }
}
