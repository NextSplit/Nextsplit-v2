import * as Sentry from '@sentry/nextjs'
import { serverConfig } from '@/lib/config'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { GeneratePlanSchema, zodError } from '@/lib/schemas'
import { checkAndIncrementAIUsage } from '@/lib/aiRateLimit'

const anthropic = new Anthropic({ apiKey: serverConfig.anthropicApiKey })

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
    const rateCheck = await checkAndIncrementAIUsage(user.id, 'free')
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: rateCheck.reason, rateLimited: true }, { status: 429 })
    }

    const parsed = GeneratePlanSchema.safeParse(await req.json())
    if (!parsed.success) return zodError(parsed.error)
    const { prompt } = parsed.data

    const message = await anthropic.messages.create({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 8000,
      messages:   [{ role: 'user', content: prompt }],
    })

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

    return NextResponse.json(plan)

  } catch (err) {
    Sentry.captureException(err, { extra: { context: 'generate-plan error:' } })
    return NextResponse.json({ error: 'Plan generation failed' }, { status: 500 })
  }
}
