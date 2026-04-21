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

function buildPrompt(data: ReturnType<typeof useOnboarding>['data']): string {
  const goal     = data.goals.find(g => g.priority === 'A') ?? data.goals[0]
  const times    = Object.entries(data.recentRaceTimes ?? {})
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${Math.floor((v as number)/60)}:${String((v as number)%60).padStart(2,'0')}`)
    .join(', ')
  const weeksOut = goal?.race_date
    ? Math.max(8, Math.min(24, Math.round((new Date(goal.race_date).getTime()-Date.now())/(7*24*3600*1000))))
    : 12

  return `You are an expert running coach. Generate a structured training plan in JSON format only.

ATHLETE PROFILE:
- Name: ${data.displayName || 'Athlete'}
- Age: ${data.age ?? 'unknown'}
- Sex: ${data.biologicalSex ?? 'unspecified'}
- Running experience: ${data.runningExperience ?? 'unknown'}
- Current weekly mileage: ${data.weeklyKmCurrent}km
- Recent race times: ${times || 'none provided'}
- Longest recent run: ${data.longestRecentRun ?? 'unknown'}km
- Preferred surfaces: ${data.runSurfaces.join(', ') || 'road'}
- Training days per week: ${data.trainingDays}
- Preferred long run day: ${data.preferredLongRunDay || 'Sunday'}
- Preferred run time: ${data.preferredRunTime ?? 'flexible'}
- Injuries/niggles: ${data.injuryNotes || 'none'}
- Health flags: ${data.healthFlags.join(', ') || 'none'}

GYM CONFIGURATION:
- Gym enabled: ${data.gymEnabled ? 'yes' : 'no'}
- Gym sessions per week: ${data.gymEnabled ? data.gymSessionsPerWeek : 0}
- Equipment access: ${data.gymEquipment.join(', ') || 'n/a'}
- Gym focus: ${data.gymFocus ?? 'general'}

PRIMARY GOAL:
- Type: ${goal?.goal_type ?? 'general_fitness'}
- Race name: ${goal?.race_name ?? 'n/a'}
- Distance: ${goal?.race_distance_label ?? 'n/a'}
- Race date: ${goal?.race_date ?? 'n/a'}
- Target time: ${goal?.target_time_secs ? `${Math.floor(goal.target_time_secs/3600)}h${Math.floor((goal.target_time_secs%3600)/60)}m` : 'n/a'}
- Weeks until race: ${weeksOut}

Generate a ${weeksOut}-week plan with periodisation (base → build → peak → taper if applicable).

Rules:
- Include ${data.trainingDays} sessions per week total (run + gym combined)
- ${data.gymEnabled ? `Include ${data.gymSessionsPerWeek} gym session(s) per week` : 'No gym sessions'}
- Progress weekly km by no more than 10% week-on-week (ACWR safety)
- Include at least 1 rest or easy recovery day per week
- Long run on ${data.preferredLongRunDay || 'Sunday'}

Respond ONLY with valid JSON, no markdown, no explanation:
{
  "name": "plan name",
  "totalWeeks": ${weeksOut},
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
              "type": "easy_run|tempo|interval|long_run|recovery|rest|gym|cross",
              "name": "session name",
              "detail": "specific coaching instruction with target pace or effort",
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
  const [msgIndex, setMsgIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [done, setDone]         = useState(false)
  const [error, setError]       = useState('')
  const hasRun = useRef(false)

  // Cycle messages + fill progress bar
  useEffect(() => {
    const msgTimer      = setInterval(() => setMsgIndex(i => (i+1) % MESSAGES.length), 1200)
    const progressTimer = setInterval(() => setProgress(p => p < 85 ? p+2 : p), 160)
    return () => { clearInterval(msgTimer); clearInterval(progressTimer) }
  }, [])

  useEffect(() => {
    if (hasRun.current) return
    hasRun.current = true

    const generate = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Not authenticated')

        // 1. Save full profile data first
        await db(supabase).from('profiles').update({
          handle:                  data.handle || null,
          character_config:        data.characterConfig,
          sport_focus:             data.sportFocus,
          display_name:            data.displayName || null,
          age:                     data.age,
          biological_sex:          data.biologicalSex,
          injury_notes:            data.injuryNotes || null,
          health_flags:            data.healthFlags,
          running_experience:      data.runningExperience,
          weekly_km_current:       data.weeklyKmCurrent,
          recent_race_times:       data.recentRaceTimes,
          longest_recent_run:      data.longestRecentRun,
          run_surfaces:            data.runSurfaces,
          training_days:           data.trainingDays,
          preferred_long_run_day:  data.preferredLongRunDay,
          preferred_run_time:      data.preferredRunTime,
          gym_enabled:             data.gymEnabled,
          gym_sessions_per_week:   data.gymSessionsPerWeek,
          gym_equipment:           data.gymEquipment,
          gym_focus:               data.gymFocus,
          onboarding_step:         10,
        }).eq('id', user.id)

        // 2. Save goals
        if (data.goals.length > 0) {
          for (const goal of data.goals) {
            await db(supabase).from('user_goals').insert({
              user_id:             user.id,
              goal_type:           goal.goal_type ?? 'general_fitness',
              priority:            goal.priority ?? 'A',
              race_name:           goal.race_name ?? null,
              race_date:           goal.race_date ?? null,
              race_distance_km:    goal.race_distance_km ?? null,
              race_distance_label: goal.race_distance_label ?? null,
              target_time_secs:    goal.target_time_secs ?? null,
              notes:               goal.notes ?? null,
            })
          }
        }

        // 3. Generate / activate plan based on path
        if (data.trainingPath === 'ai_bespoke') {
          const res = await fetch('/api/ai/generate-plan', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ prompt: buildPrompt(data) }),
          })
          if (!res.ok) throw new Error(`Plan generation failed: ${res.status}`)
          const plan = await res.json()
          await db(supabase).from('user_plans').insert({
            user_id:      user.id,
            plan_type:    'ai_bespoke',
            status:       'active',
            name:         plan.name ?? 'My AI Plan',
            total_weeks:  plan.totalWeeks ?? 12,
            current_week: 1,
            weeks_data:   plan.weeks ?? [],
            meta:         { generated_at: new Date().toISOString(), peak_km: plan.peakWeeklyKm },
            start_date:   new Date().toISOString().split('T')[0],
          })

        } else if (data.trainingPath === 'predetermined') {
          const primaryGoal = data.goals.find(g => g.priority === 'A') ?? data.goals[0]
          const raceDate    = primaryGoal?.race_date ?? null
          const weeksOut    = raceDate
            ? Math.round((new Date(raceDate).getTime()-Date.now())/(1000*60*60*24*7))
            : null

          const levelMap: Record<string, string> = {
            lt_6mo: 'beginner', '6_12mo': 'beginner', '1_3yr': 'intermediate', '3yr_plus': 'advanced',
          }
          const level     = levelMap[data.runningExperience ?? ''] ?? 'beginner'
          const distLabel = (primaryGoal?.race_distance_label ?? '').toLowerCase()
          let distFilter  = '5k'
          if (distLabel.includes('marathon') && !distLabel.includes('half')) distFilter = 'marathon'
          else if (distLabel.includes('half'))  distFilter = 'half'
          else if (distLabel.includes('10'))    distFilter = '10k'

          const { data: templates } = await db(supabase)
            .from('plan_templates')
            .select('id, name, weeks_min, weeks_max, level, distance')
            .ilike('level',    `%${level}%`)
            .ilike('distance', `%${distFilter}%`)
            .limit(5)

          let best = templates?.[0]
          if (templates && templates.length > 1 && weeksOut) {
            best = templates.reduce((acc: typeof templates[0], t: typeof templates[0]) => {
              const tW   = t.weeks_max ?? t.weeks_min ?? 12
              const accW = acc.weeks_max ?? acc.weeks_min ?? 12
              return Math.abs(tW - weeksOut) < Math.abs(accW - weeksOut) ? t : acc
            })
          }

          if (!best) {
            const { data: fallback } = await db(supabase).from('plan_templates').select('id, name').limit(1)
            best = fallback?.[0]
          }

          if (best) {
            const activateRes = await fetch('/api/plans/activate', {
              method:  'POST',
              headers: { 'Content-Type': 'application/json' },
              body:    JSON.stringify({
                template_id:  best.id,
                name:         best.name,
                race_date:    raceDate,
                plan_type:    'predetermined',
                include_gym:  data.gymEnabled,
              }),
            })
            if (!activateRes.ok) throw new Error(`Activate failed: ${activateRes.status}`)
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
        } else if (data.trainingPath === 'coach_marketplace') {
          // Create a placeholder "browsing" plan so Today tab isn't empty
          await db(supabase).from('user_plans').insert({
            user_id:      user.id,
            plan_type:    'manual',
            status:       'active',
            name:         'My Training Plan',
            total_weeks:  12,
            current_week: 1,
            weeks_data:   [],
            meta:         { path: 'coach_marketplace', placeholder: true },
            start_date:   new Date().toISOString().split('T')[0],
          })
        }
        // manual — no plan created here

        // 4. Mark onboarding complete
        await db(supabase).from('profiles').update({
          onboarding_complete: true,
          onboarding_step:     11,
        }).eq('id', user.id)

        // Clear onboarding localStorage — prevents stale state on next visit
        try {
          localStorage.removeItem('nextsplit_onboarding_step')
          localStorage.removeItem('nextsplit_onboarding_data')
        } catch { /* ignore */ }

        // 5. Auto-accept coach invite if token stored from invite link
        try {
          const inviteToken = localStorage.getItem('nextsplit_coach_invite_token')
          if (inviteToken) {
            await fetch('/api/coach/accept', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token: inviteToken }),
            })
            localStorage.removeItem('nextsplit_coach_invite_token')
          }
        } catch { /* non-blocking */ }

        setProgress(100)
        await new Promise(r => setTimeout(r, 600))
        setDone(true)

      } catch (err) {
        console.error('Plan generation error:', err)
        setError('Something went wrong — your profile is saved. You can pick a plan from the dashboard.')
        setProgress(100)
        // Still mark onboarding complete so they get through
        try {
          const supabase = createClient()
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            await db(supabase).from('profiles')
              .update({ onboarding_complete: true, onboarding_step: 11 })
              .eq('id', user.id)
          }
        } catch { /* ignore */ }
        await new Promise(r => setTimeout(r, 2000))
        setDone(true)
      }
    }

    generate()
  }, [data])

  useEffect(() => {
    if (!done) return
    if (data.trainingPath === 'coach_marketplace') {
      router.push('/marketplace')
    } else {
      next()
    }
  }, [done, data.trainingPath, next, router])

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f172a] via-[#0d3d38] to-[#0f172a] flex flex-col items-center justify-center px-6 text-center">

      <div className="relative mb-8">
        <div className="w-24 h-24 rounded-full bg-[var(--ns-forest)]/10 border border-[var(--ns-forest)]/20 flex items-center justify-center">
          <span className="text-5xl animate-bounce">🏃</span>
        </div>
        <div className="absolute inset-0 animate-spin" style={{ animationDuration: '3s' }}>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-[var(--ns-forest-mid)] opacity-60" />
        </div>
      </div>

      <h1 className="text-2xl font-black text-white mb-2">Building your plan</h1>
      <p className="text-[var(--ns-forest-light)] text-sm mb-8">Our coaches are working through your requirements</p>

      <div className="h-6 mb-6">
        <p className="text-gray-400 text-sm">{MESSAGES[msgIndex]}</p>
      </div>

      <div className="w-full max-w-xs bg-white/10 rounded-full h-1.5 overflow-hidden mb-4">
        <div
          className="h-full bg-[var(--ns-forest-mid)] rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {error && (
        <div className="mt-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 max-w-xs">
          <p className="text-amber-400 text-xs">{error}</p>
        </div>
      )}

      <div className="mt-8 text-left bg-white/5 rounded-2xl border border-white/10 p-4 w-full max-w-xs space-y-2">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Your plan</p>
        {[
          { label: 'Path',     value: ({ predetermined: 'Structured plan', ai_bespoke: 'AI coached', manual: 'Build your own', lifestyle: 'Lifestyle', coach_marketplace: 'Coach / marketplace' } as Record<string,string>)[data.trainingPath ?? ''] ?? '—' },
          { label: 'Wkly km', value: `${data.weeklyKmCurrent}km starting` },
          { label: 'Days',    value: `${data.trainingDays}x / week` },
          { label: 'Gym',     value: data.gymEnabled ? `${data.gymSessionsPerWeek}x / week` : 'Not included' },
        ].map(item => (
          <div key={item.label} className="flex justify-between text-xs">
            <span className="text-gray-500">{item.label}</span>
            <span className="text-white font-semibold">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
