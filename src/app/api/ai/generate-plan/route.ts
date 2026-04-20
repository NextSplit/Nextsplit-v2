import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/supabase/db'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

    // Rate limit — check ai_usage
    const today = new Date().toISOString().split('T')[0]
    const { data: usage } = await db(supabase)
      .from('ai_usage')
      .select('count')
      .eq('user_id', user.id)
      .eq('date', today)
      .maybeSingle()

    // Plan generation doesn't count against daily AI calls — it's a one-time onboarding action
    const { prompt } = await req.json()
    if (!prompt) return NextResponse.json({ error: 'No prompt provided' }, { status: 400 })

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
      console.error('Failed to parse AI plan JSON:', cleaned.slice(0, 200))
      plan = {
        name:        'My Training Plan',
        totalWeeks:  12,
        peakWeeklyKm: 50,
        weeks:       [],
      }
    }

    return NextResponse.json(plan)

  } catch (err) {
    console.error('generate-plan error:', err)
    return NextResponse.json({ error: 'Plan generation failed' }, { status: 500 })
  }
}
