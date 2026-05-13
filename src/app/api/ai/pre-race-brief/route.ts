import { serverConfig } from '@/lib/config'
import { NextResponse } from 'next/server'
import { AiPreRaceBriefSchema, zodError } from '@/lib/schemas'
import { createClient } from '@/lib/supabase/server'
import { getServerSubscription, requirePro } from '@/lib/serverSubscription'
import Anthropic from '@anthropic-ai/sdk'
import { checkAndIncrementAIUsage, recordTokenUsage } from '@/lib/aiRateLimit'

const anthropic = new Anthropic({ apiKey: serverConfig.anthropicApiKey })

// PR J2 — prompt caching. The role + response schema is stable across
// every athlete's pre-race brief; cache it.
const SYSTEM_PROMPT = `You are an expert running coach generating a
concise pre-race brief for an athlete.

Respond with ONLY a JSON object (no markdown, no extra text) with this
exact shape:
{
  "pacing":   "2-3 sentence pacing strategy specific to their goal and recent training",
  "fuelling": "2-3 sentence race-day nutrition plan based on distance and timing",
  "taper":    "1-2 sentence taper advice based on days remaining",
  "mindset":  "1-2 sentence confidence-building message based on their training"
}

Be specific, practical and encouraging. Reference their actual data
where possible.`

export async function POST(req: Request) {
  if (!serverConfig.anthropicApiKey) {
    return NextResponse.json({ error: 'AI not configured' }, { status: 503 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  // Server-side subscription enforcement — prevents client-side ProGate bypass
  const sub = await getServerSubscription(supabase, user.id)
  const proBlock = requirePro(sub)
  if (proBlock) return proBlock

  const rateCheck = await checkAndIncrementAIUsage(user.id, 'ai_pre_race_brief')
  if (!rateCheck.allowed) {
    return NextResponse.json({ error: rateCheck.reason, rateLimited: true }, { status: 429 })
  }

  const parsed = AiPreRaceBriefSchema.safeParse(await req.json())
  if (!parsed.success) return zodError(parsed.error)
  const { context } = parsed.data

  const raceContext = `Race context:\n${JSON.stringify(context, null, 2)}`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: [
        { type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
      ],
      messages: [{ role: 'user', content: raceContext }],
    })

    const usage = message.usage as typeof message.usage & {
      cache_read_input_tokens?:     number
      cache_creation_input_tokens?: number
    }
    await recordTokenUsage(
      user.id,
      usage.input_tokens,
      usage.output_tokens,
      'ai_pre_race_brief',
      usage.cache_read_input_tokens     ?? 0,
      usage.cache_creation_input_tokens ?? 0,
    )

    const text = message.content
      .filter(b => b.type === 'text')
      .map(b => (b as { type: 'text'; text: string }).text)
      .join('')
    const clean = text.replace(/```json|```/g, '').trim()
    const brief = JSON.parse(clean)
    return NextResponse.json({ brief })
  } catch {
    return NextResponse.json({ error: 'AI temporarily unavailable' }, { status: 503 })
  }
}
