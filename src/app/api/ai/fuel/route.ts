import { serverConfig } from '@/lib/config'
import { NextResponse } from 'next/server'
import { AiFuelCoachSchema, zodError } from '@/lib/schemas'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { checkAndIncrementAIUsage, recordTokenUsage } from '@/lib/aiRateLimit'

// PR C2 — Nutrition AI Coach.
// Single-paragraph plan-aware fuel advice. Uses prompt caching on the
// system prompt + the user's NutritionSettings/targets (both stable
// across questions in the same session) so follow-up turns hit the
// cache and pay reduced output cost.
//
// Not Pro-gated in C2 (pre-alpha; founder said to dog-food first). Rate
// limit guard remains via checkAndIncrementAIUsage to protect spend.

const anthropic = new Anthropic({ apiKey: serverConfig.anthropicApiKey })

const SYSTEM_PROMPT = `You are NextSplit's nutrition coach for runners.
Your job: answer the user's specific question with one short paragraph
(3-5 sentences max) of plan-aware fuel advice.

Rules:
- Use the user's calorie + macro targets as the baseline.
- Reference today's planned session when relevant (e.g., long run =
  carb-load; rest day = maintenance).
- Be specific (grams, foods, timing). Avoid vague answers.
- Don't lecture. Don't repeat the question. Don't list disclaimers.
- If the question is ambiguous, pick the most likely interpretation
  and answer it.
- Plain text only. No markdown, no headers, no bullets.`

export async function POST(req: Request) {
  if (!serverConfig.anthropicApiKey) {
    return NextResponse.json({ error: 'AI not configured' }, { status: 503 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const rateCheck = await checkAndIncrementAIUsage(user.id, 'ai_fuel')
  if (!rateCheck.allowed) {
    return NextResponse.json({ error: rateCheck.reason, rateLimited: true }, { status: 429 })
  }

  const parsed = AiFuelCoachSchema.safeParse(await req.json())
  if (!parsed.success) return zodError(parsed.error)
  const { question, settings, targets, todaySession } = parsed.data

  const profileBlock = [
    `Profile: ${settings.weight_kg}kg, ${settings.height_cm}cm, ${settings.age}yo, ${settings.sex}.`,
    `Activity: ${settings.activity_level}. Goal: ${settings.goal}.`,
    `Daily targets: ${targets.calories}kcal · ${targets.protein_g}g protein · ${targets.carbs_g}g carbs · ${targets.fat_g}g fat.`,
  ].join(' ')

  const sessionBlock = todaySession
    ? `Today's planned session: ${todaySession.name ?? todaySession.code ?? 'unknown'}${todaySession.km ? ` (${todaySession.km}km)` : ''}.`
    : `No planned session today (rest day).`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 350,
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
        {
          type: 'text',
          text: `${profileBlock}\n${sessionBlock}`,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [{ role: 'user', content: question }],
    })

    const answer = message.content
      .filter(b => b.type === 'text')
      .map(b => (b as { type: 'text'; text: string }).text)
      .join('')
      .trim()

    // PR G2 — record token usage so the AI cost dashboard can attribute
    // spend to this endpoint. PR I2 — cache_* tokens passed separately so
    // the dashboard prices them at the cache tier ($0.30/M reads, $3.75/M
    // creation) instead of the $3/M standard input rate. /api/ai/fuel is
    // the cache-heavy endpoint (system prompt + profile/targets block
    // both ephemeral-cached), so this materially reduces reported spend.
    // Non-fatal — analytics, not gating.
    const usage = message.usage as typeof message.usage & {
      cache_read_input_tokens?:     number
      cache_creation_input_tokens?: number
    }
    await recordTokenUsage(
      user.id,
      usage.input_tokens,
      usage.output_tokens,
      'ai_fuel',
      usage.cache_read_input_tokens     ?? 0,
      usage.cache_creation_input_tokens ?? 0,
    )

    return NextResponse.json({ answer })
  } catch {
    return NextResponse.json({ error: 'AI temporarily unavailable' }, { status: 503 })
  }
}
