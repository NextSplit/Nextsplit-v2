import * as Sentry from '@sentry/nextjs'
import { serverConfig } from '@/lib/config'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/supabase/db'
import { GeneratePlanSchema, zodError } from '@/lib/schemas'

const anthropic = new Anthropic({ apiKey: serverConfig.anthropicApiKey })

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    const parsed = GeneratePlanSchema.safeParse(await req.json())
    if (!parsed.success) return zodError(parsed.error)
    const { prompt } = parsed.data

    const today = new Date().toISOString().split('T')[0]
    await db(supabase).from('ai_usage').upsert(
      { user_id: user.id, date: today, feature: 'generate_plan', count: 1 },
      { onConflict: 'user_id,date,feature', ignoreDuplicates: false }
    ).catch(() => {}) // Non-blocking
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
      Sentry.captureException(new Error('Failed to parse AI plan JSON:', cleaned.slice(0, 200))
)
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
