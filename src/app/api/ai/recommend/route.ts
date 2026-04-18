import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const SLUG_LABELS: Record<string, string> = {
  '5k_couch_to_5k': 'Couch to 5K',
  '5k_improve': '5K Improver',
  '5k_performance': '5K Performance',
  '10k_beginner': '10K Beginner',
  '10k_intermediate': '10K Intermediate',
  '10k_performance': '10K Performance',
  'half_novice': 'Half Marathon Novice',
  'half_intermediate': 'Half Marathon Intermediate',
  'half_performance': 'Half Marathon Performance',
  'marathon_novice': 'Marathon Novice',
  'marathon_intermediate': 'Marathon Intermediate',
  'marathon_performance': 'Marathon Performance',
  'ultra_50mi': '50-Mile Ultra',
  'ultra_100mi': '100-Mile Ultra',
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const { goal, level, raceDate, slug } = body

  const planLabel = SLUG_LABELS[slug] ?? slug
  const daysToRace = raceDate
    ? Math.ceil((new Date(raceDate).getTime() - Date.now()) / 86_400_000)
    : null

  // If no API key, return a good static fallback
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({
      recommendation: `Based on your **${level}** experience and **${goal.replace('_', ' ')}** goal, the **${planLabel}** plan is the right fit. It's structured to build your fitness progressively, with the right balance of easy runs, quality sessions, and recovery.${daysToRace ? ` With ${daysToRace} days to your race, the timing works well.` : ''}`,
      suggestedName: `${goal.charAt(0).toUpperCase() + goal.slice(1)} ${new Date().getFullYear()}`,
    })
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const prompt = `You are a world-class running coach onboarding a new athlete into the NextSplit training app.

Athlete profile:
- Goal: ${goal} (${goal === '5k' ? '5 kilometres' : goal === '10k' ? '10 kilometres' : goal === 'half' ? 'half marathon' : goal === 'marathon' ? 'full marathon' : goal === 'ultra' ? 'ultra distance' : 'general running fitness'})
- Experience: ${level}
- Race date: ${raceDate ? `${new Date(raceDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} (${daysToRace} days away)` : 'not set'}
- Recommended plan: ${planLabel}

Write a short, warm, personalised coach message (3-4 sentences) explaining why this plan suits them. Reference their specific goal and experience level. Be encouraging but specific — mention one key thing they should focus on in this training block. Do not use generic platitudes. Use **bold** for key terms.

Also suggest a good name for their plan (just the name, no explanation, keep it short and personal).

Respond ONLY with valid JSON: {"recommendation": "...", "suggestedName": "..."}`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content
      .filter(b => b.type === 'text')
      .map(b => (b as { type: 'text'; text: string }).text)
      .join('')

    const clean = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)

    return NextResponse.json({
      recommendation: parsed.recommendation ?? '',
      suggestedName: parsed.suggestedName ?? `${goal} ${new Date().getFullYear()}`,
    })
  } catch {
    return NextResponse.json({
      recommendation: `The **${planLabel}** plan is the right fit for your **${level}** experience and **${goal}** goal. It builds your fitness progressively with the right mix of easy runs, quality sessions, and recovery.`,
      suggestedName: `${goal.charAt(0).toUpperCase() + goal.slice(1)} ${new Date().getFullYear()}`,
    })
  }
}
