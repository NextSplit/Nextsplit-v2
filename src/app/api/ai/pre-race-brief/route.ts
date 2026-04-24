import { serverConfig } from '@/lib/config'
import { NextResponse } from 'next/server'
import { AiPreRaceBriefSchema, zodError } from '@/lib/schemas'
import { createClient } from '@/lib/supabase/server'
import { getServerSubscription, requirePro } from '@/lib/serverSubscription'
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

  // Server-side subscription enforcement — prevents client-side ProGate bypass
  const sub = await getServerSubscription(supabase, user.id)
  const proBlock = requirePro(sub)
  if (proBlock) return proBlock

  const rateCheck = await checkAndIncrementAIUsage(user.id, 'free')
  if (!rateCheck.allowed) {
    return NextResponse.json({ error: rateCheck.reason, rateLimited: true }, { status: 429 })
  }

  const parsed = AiPreRaceBriefSchema.safeParse(await req.json())
  if (!parsed.success) return zodError(parsed.error)
  const { context } = parsed.data

  const prompt = `You are an expert running coach. Generate a concise pre-race brief for this athlete.

Race context:
${JSON.stringify(context, null, 2)}

Respond with ONLY a JSON object (no markdown, no extra text):
{
  "pacing": "2-3 sentence pacing strategy specific to their goal and recent training",
  "fuelling": "2-3 sentence race-day nutrition plan based on distance and timing",
  "taper": "1-2 sentence taper advice based on days remaining",
  "mindset": "1-2 sentence confidence-building message based on their training"
}

Be specific, practical and encouraging. Reference their actual data where possible.`

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
    const brief = JSON.parse(clean)
    return NextResponse.json({ brief })
  } catch {
    return NextResponse.json({ error: 'AI temporarily unavailable' }, { status: 503 })
  }
}
