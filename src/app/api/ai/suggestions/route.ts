import { serverConfig } from '@/lib/config'
import { NextResponse } from 'next/server'
import { AiSuggestionsSchema, zodError } from '@/lib/schemas'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { checkAndIncrementAIUsage } from '@/lib/aiRateLimit'

const anthropic = new Anthropic({ apiKey: serverConfig.anthropicApiKey })

export async function POST(req: Request) {
  if (!serverConfig.anthropicApiKey) {
    return NextResponse.json({ error: 'AI not configured' }, { status: 503 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const rateCheck = await checkAndIncrementAIUsage(user.id, 'free')
  if (!rateCheck.allowed) {
    return NextResponse.json({ error: rateCheck.reason, rateLimited: true }, { status: 429 })
  }

  const parsed = AiSuggestionsSchema.safeParse(await req.json())
  if (!parsed.success) return zodError(parsed.error)
  const { analysisData } = parsed.data

  const prompt = `${JSON.stringify(analysisData, null, 2)}

Generate 2-3 specific, actionable coaching suggestions based on the data.

ACWR guidance: under 0.8 = under-training, 0.8-1.3 = optimal, over 1.3 = injury risk.
Adherence guidance: under 70% = concern, 70-90% = acceptable, 90-110% = ideal, over 110% = overdoing it.

Respond with ONLY a JSON array (no markdown):
[
  {
    "id": "unique-slug",
    "type": "load" | "pace" | "recovery" | "positive",
    "title": "Short title (under 8 words)",
    "body": "2-3 sentence specific suggestion referencing their data",
    "action": "optional: specific action they should take this week"
  }
]

Types: "load" for volume/injury concerns, "pace" for speed/intensity feedback, "recovery" for rest/wellness, "positive" for achievements to reinforce.
Be specific, not generic. Reference actual numbers from their data.`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    })
    const text = message.content
      .filter(b => b.type === 'text')
      .map(b => (b as { type: 'text'; text: string }).text)
      .join('')
    const clean = text.replace(/```json|```/g, '').trim()
    const suggestions = JSON.parse(clean)
    return NextResponse.json({ suggestions })
  } catch {
    return NextResponse.json({ error: 'AI temporarily unavailable' }, { status: 503 })
  }
}
