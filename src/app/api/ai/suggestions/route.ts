import { serverConfig } from '@/lib/config'
import { NextResponse } from 'next/server'
import { AiSuggestionsSchema, zodError } from '@/lib/schemas'
import { createClient } from '@/lib/supabase/server'
import { getServerSubscription, requirePro } from '@/lib/serverSubscription'
import Anthropic from '@anthropic-ai/sdk'
import { checkAndIncrementAIUsage, recordTokenUsage } from '@/lib/aiRateLimit'

const anthropic = new Anthropic({ apiKey: serverConfig.anthropicApiKey })

// PR J2 — prompt caching. Role + response schema is stable across athletes.
const SYSTEM_PROMPT = `You are a running coach reading training data
and producing 2-3 specific, actionable coaching suggestions.

Guidance:
- ACWR: under 0.8 = under-training, 0.8-1.3 = optimal, over 1.3 = injury risk.
- Adherence: under 70% = concern, 70-90% = acceptable, 90-110% = ideal,
  over 110% = overdoing it.

Respond with ONLY a JSON array (no markdown, no extra text):
[
  {
    "id":     "unique-slug",
    "type":   "load" | "pace" | "recovery" | "positive",
    "title":  "Short title (under 8 words)",
    "body":   "2-3 sentence specific suggestion referencing their data",
    "action": "optional: specific action they should take this week"
  }
]

Types:
- "load"     for volume/injury concerns
- "pace"     for speed/intensity feedback
- "recovery" for rest/wellness
- "positive" for achievements to reinforce

Be specific, not generic. Reference actual numbers from their data.`

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

  const rateCheck = await checkAndIncrementAIUsage(user.id, 'ai_suggestions')
  if (!rateCheck.allowed) {
    return NextResponse.json({ error: rateCheck.reason, rateLimited: true }, { status: 429 })
  }

  const parsed = AiSuggestionsSchema.safeParse(await req.json())
  if (!parsed.success) return zodError(parsed.error)
  const { analysisData } = parsed.data

  const analysisBlock = `Training data:\n${JSON.stringify(analysisData, null, 2)}`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: [
        { type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
      ],
      messages: [{ role: 'user', content: analysisBlock }],
    })

    const usage = message.usage as typeof message.usage & {
      cache_read_input_tokens?:     number
      cache_creation_input_tokens?: number
    }
    await recordTokenUsage(
      user.id,
      usage.input_tokens,
      usage.output_tokens,
      'ai_suggestions',
      usage.cache_read_input_tokens     ?? 0,
      usage.cache_creation_input_tokens ?? 0,
    )

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
