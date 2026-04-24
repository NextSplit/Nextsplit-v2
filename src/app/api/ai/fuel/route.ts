import { serverConfig } from '@/lib/config'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { checkAndIncrementAIUsage } from '@/lib/aiRateLimit'
import { AiFuelSchema, zodError } from '@/lib/schemas'

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

  const parsed = AiFuelSchema.safeParse(await req.json())
  if (!parsed.success) return zodError(parsed.error)
  const { dayType, planName, targets, totals } = parsed.data

  const kcalGap = targets?.kcal > 0 ? targets.kcal - Math.round(totals?.kcal ?? 0) : null
  const prompt = `You are a sports nutrition coach for a runner. Give ONE specific, practical nutrition tip for today.

Context:
- Training day type: ${dayType}
- Plan: ${planName || 'Running plan'}
- Calorie target: ${targets?.kcal > 0 ? targets.kcal + ' kcal' : 'not set'}
- Protein target: ${targets?.protein > 0 ? targets.protein + 'g' : 'not set'}
- Carbs target: ${targets?.carbs > 0 ? targets.carbs + 'g' : 'not set'}
${kcalGap !== null && kcalGap > 0 ? `- Still ${kcalGap} kcal to eat today` : ''}
${kcalGap !== null && kcalGap < 0 ? `- Already ${Math.abs(kcalGap)} kcal over target` : ''}

Rules:
- One tip only, 1-2 sentences max
- Be specific (mention actual foods or timings)
- Tailor to the day type (rest day vs long run vs intervals etc)
- No preamble, no "Great question!", just the tip
- Start with an action verb`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 120,
      messages: [{ role: 'user', content: prompt }],
    })
    const text = message.content
      .filter(b => b.type === 'text')
      .map(b => (b as { type: 'text'; text: string }).text)
      .join('').trim()
    return NextResponse.json({ tip: text })
  } catch {
    return NextResponse.json({ error: 'AI temporarily unavailable' }, { status: 503 })
  }
}
