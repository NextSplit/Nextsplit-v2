import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { RPG_BADGES, RPG_CHARS, RARITY_CONFIG, computeRPGStats, getLevelForXP, getXPProgress, renderCharSVG } from '@/lib/rpg'
import { computePersonalBests } from '@/lib/personalBests'
import { computeStreak } from '@/lib/streak'
import type { Metadata } from 'next'

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await params
  const name = decodeURIComponent(username)
  return {
    title: `${name} — NextSplit`,
    description: `${name}'s running profile on NextSplit`,
    openGraph: {
      title: `${name} on NextSplit`,
      description: 'Track. Log. Level up.',
    },
  }
}

export default async function PublicProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  const displayName = decodeURIComponent(username)

  const supabase = await createClient()

  // Look up profile by display_name (anon-accessible if RLS allows)
  const { data: profileRow } = await supabase
    .from('profiles')
    .select('id, display_name')
    .eq('display_name', displayName)
    .maybeSingle()

  if (!profileRow) notFound()

  const profile = profileRow as { id: string; display_name: string | null }
  const userId = profile.id

  // Fetch training logs (all plans)
  const { data: logsRaw } = await supabase
    .from('training_logs')
    .select('week_n, day_i, session_i, done, km, effort, logged_at, plan_id')
    .eq('user_id', userId)
    .eq('done', true)

  // Fetch active plan for weeks_data
  const { data: planRaw } = await supabase
    .from('user_plans')
    .select('weeks_data, current_week, name, total_weeks, status')
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle()

  // Fetch RPG char from profiles meta (we store it in a separate query if needed)
  // For now, default to first char — we don't expose charId publicly unless added to profile table
  const charId = 'm1'

  const logs = (logsRaw ?? []) as Array<{
    week_n: number; day_i: number; session_i: number
    done: boolean; km: number | null; effort: number | null; logged_at: string; plan_id: string
  }>

  // Build weeks data for RPG computation
  type WeekDay = { sessions: Array<{ c: string; km: number }> }
  type Week = { n: number; days: WeekDay[] }
  type PlanRow = { weeks_data: unknown; current_week: number; name: string; total_weeks: number; status: string }
  const plan = planRaw as PlanRow | null
  const weeks: Week[] = plan?.weeks_data
    ? (plan.weeks_data as Week[])
    : []

  // RPG stats
  const rpgStats = computeRPGStats(
    logs.map(l => ({
      done: l.done, km: l.km, week_n: l.week_n,
      day_i: l.day_i, session_i: l.session_i, logged_at: l.logged_at,
    })),
    weeks,
    0, 0, 0
  )

  const unlockedIds = new Set(RPG_BADGES.filter(b => b.check(rpgStats)).map(b => b.id))
  const unlockedBadges = RPG_BADGES.filter(b => unlockedIds.has(b.id))

  // PBs
  const pbs = computePersonalBests(logs.map(l => ({
    ...l, pace: null, hr: null, duration_secs: null, notes: null,
    splits: null, strava_id: null, id: '', user_id: userId, plan_id: l.plan_id,
    created_at: '', updated_at: '',
  })))

  // Streak
  const streak = computeStreak(logs.map(l => ({ ...l, done: true })))

  const progress = getXPProgress(rpgStats.xp)
  const level = rpgStats.level
  const svgAvatar = renderCharSVG(charId, level.level, 120, 150)

  const RACE_LABELS: Record<number, string> = { 5: '5K', 10: '10K', 21.0975: 'Half', 42.195: 'Marathon' }

  return (
    <div className="min-h-screen bg-[#f8f8f6]">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-4">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <a href="/" className="text-[#0D9488] font-black text-lg tracking-tight">NextSplit</a>
          <a href="/auth/login"
            className="text-xs font-semibold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full">
            Get the app →
          </a>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">

        {/* Hero card */}
        <div className="rounded-3xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #0f3460 100%)' }}>
          <div className="p-5">
            <div className="flex items-start gap-4 mb-4">
              <div className="relative flex-shrink-0">
                <div dangerouslySetInnerHTML={{ __html: svgAvatar }} />
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-[#0D9488] text-white text-[10px] font-black px-2 py-0.5 rounded-full whitespace-nowrap shadow-lg">
                  Lv.{level.level}
                </div>
              </div>
              <div className="flex-1 min-w-0 pt-1">
                <div className="text-white font-black text-xl leading-tight">{displayName}</div>
                <div className="text-teal-300 text-xs font-semibold mt-0.5">{level.name}</div>
                {plan && (
                  <div className="text-gray-400 text-[10px] mt-0.5">{plan.name} · W{plan.current_week}/{plan.total_weeks}</div>
                )}
                <div className="mt-3">
                  <div className="flex justify-between text-[9px] mb-1">
                    <span className="text-gray-400">{rpgStats.xp.toLocaleString()} XP</span>
                  </div>
                  <div className="h-2.5 bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #0D9488, #818cf8)' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Stats strip */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'km', value: Math.round(rpgStats.totalKm) + '', colour: 'text-emerald-400' },
                { label: 'sessions', value: rpgStats.totalRuns + '', colour: 'text-blue-400' },
                { label: 'streak', value: streak.current + 'd', colour: 'text-orange-400' },
                { label: 'badges', value: unlockedBadges.length + '', colour: 'text-purple-400' },
              ].map(s => (
                <div key={s.label} className="bg-white/10 rounded-xl p-2 text-center">
                  <div className={`text-sm font-black ${s.colour}`}>{s.value}</div>
                  <div className="text-[8px] text-gray-400 mt-0.5 leading-tight">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Badges */}
        {unlockedBadges.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <p className="text-sm font-bold text-gray-900 mb-3">🏆 Badges ({unlockedBadges.length})</p>
            <div className="grid grid-cols-4 gap-2">
              {unlockedBadges.map(b => {
                const r = RARITY_CONFIG[b.rarity]
                return (
                  <div key={b.id} title={`${b.name} — ${b.desc}`}
                    className={`rounded-xl border p-2 text-center ${r.border} ${b.rarity === 'legendary' ? r.glow : ''}`}>
                    <div className="text-2xl">{b.emoji}</div>
                    <div className="text-[8px] font-bold text-gray-500 mt-0.5 leading-tight truncate">{b.name}</div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Personal Bests */}
        {pbs.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <p className="text-sm font-bold text-gray-900 mb-3">Personal Bests</p>
            <div className="grid grid-cols-2 gap-2">
              {pbs.map(pb => (
                <div key={pb.distanceKm} className="bg-teal-50 border border-teal-100 rounded-xl p-3">
                  <div className="text-[10px] text-teal-600 font-bold">
                    {Object.entries(RACE_LABELS).find(([km]) => Math.abs(Number(km) - pb.distanceKm) < 0.1)?.[1] ?? `${pb.distanceKm}km`}
                  </div>
                  <div className="text-lg font-black text-gray-900">{pb.timeStr}</div>
                  <div className="text-[9px] text-gray-400">{pb.pacePerKm}/km</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="bg-gradient-to-r from-teal-500 to-emerald-500 rounded-2xl p-5 text-center">
          <p className="text-white font-black text-base mb-1">Track your runs with NextSplit</p>
          <p className="text-teal-100 text-xs mb-4">AI coaching, gamification, and real training plans</p>
          <a href="/auth/login"
            className="inline-block bg-white text-teal-600 font-bold text-sm px-6 py-2.5 rounded-xl">
            Start for free →
          </a>
        </div>

      </div>
    </div>
  )
}
