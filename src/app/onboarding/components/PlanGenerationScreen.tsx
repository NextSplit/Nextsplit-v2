'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useOnboarding } from '../context/OnboardingContext'
import { createClient } from '@/lib/supabase/client'
import { db } from '@/lib/supabase/db'

const MESSAGES = [
  'Analysing your profile…',
  'Calculating your training zones…',
  'Mapping your race calendar…',
  'Structuring your weekly load…',
  'Building your sessions…',
  'Adding strength work…',
  'Fine-tuning the pacing…',
  'Almost ready…',
]

// Build AI prompt from onboarding data
function buildPrompt(data: ReturnType<typeof useOnboarding>['data']): string {
  const goal = data.goals.find(g => g.priority === 'A') ?? data.goals[0]
  const raceTimes = data.recentRaceTimes
  const times = Object.entries(raceTimes)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${Math.floor((v as number) / 60)}:${String((v as number) % 60).padStart(2, '0')}`)
    .join(', ')

  return `You are an expert running coach. Generate a structured training plan in JSON format.

ATHLETE PROFILE:
- Name: ${data.displayName}
- Experience: ${data.runningExperience}
- Current weekly km: ${data.weeklyKmCurrent}km
- Recent race times: ${times || 'none provided'}
- Training days per week: ${data.trainingDays}
- Preferred long run day: ${data.preferredLongRunDay || 'flexible'}
- Run surfaces: ${data.runSurfaces.join(', ') || 'road'}
- Injuries/niggles: ${data.injuryNotes || 'none'}
- Gym enabled: ${data.gymEnabled ? `yes, ${data.gymSessionsPerWeek}x/week, focus: ${data.gymFocus}` : 'no'}
- Equipment: ${data.gymEquipment.join(', ') || 'n/a'}

PRIMARY GOAL:
- Type: ${goal?.goal_type}
- Race: ${goal?.race_name || 'n/a'}
- Distance: ${goal?.race_distance_label || 'n/a'}
- Date: ${goal?.race_date || 'n/a'}
- Target time: ${goal?.target_time_secs ? `${Math.floor(goal.target_time_secs / 3600)}:${String(Math.floor((goal.target_time_secs % 3600) / 60)).padStart(2, '0')}:${String(goal.target_time_secs % 60).padStart(2, '0')}` : 'n/a'}

Generate a ${goal?.race_date ? Math.max(8, Math.min(20, Math.round((new Date(goal.race_date).getTime() - Date.now()) / (7 * 24 * 3600 * 1000)))) : 12}-week plan.

Respond ONLY with valid JSON matching this structure exactly:
{
  "name": "plan name",
  "totalWeeks": number,
  "peakWeeklyKm": number,
  "weeks": [
    {
      "n": 1,
      "title": "Base Building",
      "phase": "base",
      "targetKm": number,
      "days": [
        {
          "day": "Mon",
          "sessions": [
            {
              "type": "easy_run | tempo | interval | long_run | recovery | rest | gym | cross",
              "name": "session name",
              "detail": "coaching instruction",
              "km": number or null
            }
          ]
        }
      ]
    }
  ]
}`
}

export function PlanGenerationScreen() {
  const { data, next } = useOnboarding()
  const router          = useRouter()
  const [msgIndex, setMsgIndex]       = useState(0)
  const [progress, setProgress]       = useState(0)
  const [done, setDone]               = useState(false)
  const [error, setError]             = useState('')
  const hasRun = useRef(false)

  useEffect(() => {
    // Cycle through messages
    const msgTimer = setInterval(() => {
      setMsgIndex(i => (i + 1) % MESSAGES.length)
    }, 1200)

    // Progress bar animation — fills over ~8 seconds then waits for API
    const progressTimer = setInterval(() => {
      setProgress(p => p < 85 ? p + 2 : p)
    }, 160)

    return () => {
      clearInterval(msgTimer)
      clearInterval(progressTimer)
    }
  }, [])

  useEffect(() => {
    if (hasRun.current) return
    hasRun.current = true

    const generate = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Not authenticated')

        if (data.trainingPath === 'ai_bespoke') {
          // Call AI plan generation
          const res = await fetch('/api/ai/generate-plan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: buildPrompt(data) }),
          })
          if (!res.ok) throw new Error('Plan generation failed')
          const plan = await res.json()

          // Save as user_plan
          await db(supabase).from('user_plans').insert({
            user_id:      user.id,
            plan_type:    'ai_bespoke',
            status:       'active',
            name:         plan.name ?? 'My AI Plan',
            total_weeks:  plan.totalWeeks ?? 12,
            current_week: 1,
            weeks_data:   plan.weeks ?? [],
            meta:         { generated_at: new Date().toISOString(), path: 'ai_bespoke' },
            start_date:   new Date().toISOString().split('T')[0],
          })
        } else if (data.trainingPath === 'predetermined') {
          // Smart template matching based on goal + experience + race date
          const primaryGoal = data.goals.find(g => g.priority === 'A') ?? data.goals[0]
          const raceDate    = primaryGoal?.race_date ?? null
          const weeksOut    = raceDate
            ? Math.round((new Date(raceDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 7))
            : null

          // Map experience to level
          const levelMap: Record<string, string> = {
            lt_6mo:   'beginner',
            '6_12mo': 'beginner',
            '1_3yr':  'intermediate',
            '3yr_plus': 'advanced',
          }
          const level = levelMap[data.runningExperience ?? ''] ?? 'beginner'

          // Match distance from goal
          const distLabel = primaryGoal?.race_distance_label ?? ''
          let distFilter = '5k'
          if (distLabel.toLowerCase().includes('marathon') && !distLabel.toLowerCase().includes('half')) distFilter = 'marathon'
          else if (distLabel.toLowerCase().includes('half')) distFilter = 'half'
          else if (distLabel.toLowerCase().includes('10')) distFilter = '10k'

          // Fetch templates filtered by level and distance
          const { data: templates } = await db(supabase)
            .from('plan_templates')
            .select('id, slug, name, weeks_min, weeks_max, runs_per_week, level, distance')
            .ilike('level', `%${level}%`)
            .ilike('distance', `%${distFilter}%`)
            .limit(5)

          // Pick the best fit by weeks — closest to weeksOut without going over
          let best = templates?.[0]
          if (templates && templates.length > 1 && weeksOut) {
            best = templates.reduce((acc: typeof templates[0], t: typeof templates[0]) => {
              const tWeeks = t.weeks_max ?? t.weeks_min ?? 12
              const accWeeks = acc.weeks_max ?? acc.weeks_min ?? 12
              return Math.abs(tWeeks - weeksOut) < Math.abs(accWeeks - weeksOut) ? t : acc
            })
          }

          // Fall back to any template if no match
          if (!best) {
            const { data: fallback } = await db(supabase)
              .from('plan_templates')
              .select('id, slug, name, weeks_min')
              .limit(1)
            best = fallback?.[0]
          }

          if (best) {
            // Use the activate route to get proper weeks_data
            const activateRes = await fetch('/api/plans/activate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                template_id:  best.id,
                name:         best.name,
                race_date:    raceDate,
                plan_type:    'predetermined',
                include_gym:  data.gymEnabled,
              }),
            })
            if (!activateRes.ok) {
              console.error('Activate failed:', await activateRes.text())
            }
          }
        } else if (data.trainingPath === 'lifestyle') {
          await db(supabase).from('user_plans').insert({
            user_id:      user.id,
            plan_type:    'lifestyle',
            status:       'active',
            name:         'Lifestyle Training',
            total_weeks:  52,
            current_week: 1,
            weeks_data:   [],
            meta:         { path: 'lifestyle', difficulty: 0 },
            start_date:   new Date().toISOString().split('T')[0],
          })
        }
        // manual & coach_marketplace go straight through — no plan created yet

        // Mark onboarding complete
        await db(supabase).from('profiles').update({
          onboarding_complete: true,
          onboarding_step: 10,
          handle: data.handle,
          character_config: data.characterConfig,
        }).eq('id', user.id)

        setProgress(100)
        await new Promise(r => setTimeout(r, 600))
        setDone(true)

      } catch (err) {
        console.error('Plan generation error:', err)
        setError('Something went wrong building your plan. You can set up your plan from the dashboard.')
        setProgress(100)
        await new Promise(r => setTimeout(r, 1500))
        setDone(true)
      }
    }

    generate()
  }, [data])

  useEffect(() => {
    if (done) {
      if (data.trainingPath === 'coach_marketplace') {
        router.push('/marketplace')
      } else if (data.trainingPath === 'manual') {
        next() // go to preview with empty plan
      } else {
        next()
      }
    }
  }, [done, data.trainingPath, next, router])

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f172a] via-[#0d3d38] to-[#0f172a] flex flex-col items-center justify-center px-6 text-center">

      {/* Animated runner */}
      <div className="relative mb-8">
        <div className="w-24 h-24 rounded-full bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
          <span className="text-5xl animate-bounce">🏃</span>
        </div>
        {/* Orbiting dots */}
        <div className="absolute inset-0 animate-spin" style={{ animationDuration: '3s' }}>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-teal-400 opacity-60" />
        </div>
        <div className="absolute inset-0 animate-spin" style={{ animationDuration: '2s', animationDirection: 'reverse' }}>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-teal-300 opacity-40" />
        </div>
      </div>

      {/* Headline */}
      <h1 className="text-2xl font-black text-white mb-2">
        Building your plan
      </h1>
      <p className="text-teal-300 text-sm mb-8">
        Our coaches are working through your requirements
      </p>

      {/* Cycling message */}
      <div className="h-6 mb-6">
        <p className="text-slate-400 text-sm transition-all duration-500">
          {MESSAGES[msgIndex]}
        </p>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-xs bg-white/10 rounded-full h-1.5 overflow-hidden mb-4">
        <div
          className="h-full bg-teal-400 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {error && (
        <p className="text-amber-400 text-xs mt-4 max-w-xs">{error}</p>
      )}

      {/* Profile summary */}
      <div className="mt-8 text-left bg-white/5 rounded-2xl border border-white/10 p-4 w-full max-w-xs space-y-2">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Your profile</p>
        {[
          { label: 'Experience', value: ({ lt_6mo: '< 6 months', '6_12mo': '6–12 months', '1_3yr': '1–3 years', '3yr_plus': '3+ years' } as Record<string, string>)[data.runningExperience ?? ''] ?? '—' },
          { label: 'Weekly km', value: `${data.weeklyKmCurrent}km` },
          { label: 'Training days', value: `${data.trainingDays}x / week` },
          { label: 'Gym', value: data.gymEnabled ? `${data.gymSessionsPerWeek}x / week` : 'Not included' },
          { label: 'Path', value: ({ predetermined: 'Structured plan', ai_bespoke: 'AI coached', manual: 'Build your own', lifestyle: 'Lifestyle', coach_marketplace: 'Coach / marketplace' } as Record<string, string>)[data.trainingPath ?? ''] ?? '—' },
        ].map(item => (
          <div key={item.label} className="flex justify-between text-xs">
            <span className="text-slate-500">{item.label}</span>
            <span className="text-white font-semibold">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
