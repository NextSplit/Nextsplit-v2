'use client'

import Link from 'next/link'

interface Achievement {
  id: string
  type: string
  earned_at: string
  season_month: string | null
  description: string | null
  icon: string | null
}

interface Season {
  id: string
  season_type: 'month' | 'year' | 'lifetime'
  period: string
  total_km: number
  total_sessions: number
  active_members: number
  goal_hit: boolean
}

interface Squad {
  id: string
  name: string
  colour: string
  goal_type: string | null
  goal_value: number | null
  created_at: string
}

interface Props {
  squad: Squad
  achievements: Achievement[]
  seasons: Season[]
  alltimeKm: number
  isPremium: boolean
}

const ACHIEVEMENT_META: Record<string, { icon: string; label: string; description: string }> = {
  monthly_goal_hit:          { icon: '🎯', label: 'Goal Crusher',          description: 'Squad hit the monthly goal' },
  first_collective_marathon: { icon: '🏅', label: 'Collective Marathon',   description: '42.2km covered together in one day' },
  streak_squad:              { icon: '🔥', label: 'Squad on Fire',         description: 'Every member ran 7 days straight' },
  squad_complete_plan:       { icon: '📋', label: 'Plan Complete',         description: 'A squad member finished their training plan' },
  first_run:                 { icon: '👟', label: 'First Steps',           description: 'Squad logged their first run together' },
  century_km:                { icon: '💯', label: '100km Club',            description: 'Squad covered 100km this month' },
  five_members:              { icon: '👑', label: 'Full Squad',            description: 'Squad reached 5 members' },
  distance_pb:               { icon: '⚡', label: 'Distance PB',           description: 'A squad member set a new distance record' },
  race_result:               { icon: '🏁', label: 'Race Finisher',         description: 'A squad member completed a race' },
}

function fmtKm(km: number) {
  return km >= 100 ? `${Math.round(km)}` : km.toFixed(1)
}

function fmtPeriod(period: string, type: string) {
  if (type === 'lifetime') return 'All Time'
  if (type === 'year') return period
  // YYYY-MM
  const [year, month] = period.split('-')
  const d = new Date(parseInt(year), parseInt(month) - 1)
  return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}

function fmtDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function TrophyRoomClient({ squad, achievements, seasons, alltimeKm, isPremium }: Props) {
  const colour = squad.colour ?? '#c49a3c'
  const monthlySeasons = seasons.filter(s => s.season_type === 'month')
  const annualSeasons  = seasons.filter(s => s.season_type === 'year')

  return (
    <main className="min-h-screen pb-28" style={{ background: 'var(--color-bg)' }}>

      {/* Header */}
      <div className="px-4 pt-14 pb-6"
        style={{ background: `linear-gradient(180deg, ${colour}22 0%, var(--color-bg) 100%)` }}>
        <div className="max-w-lg mx-auto">
          <Link href="/squad" className="flex items-center gap-2 mb-4"
            style={{ color: 'var(--color-text-tertiary)' }}>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-xs font-bold">{squad.name}</span>
          </Link>

          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
              style={{ background: `${colour}30` }}>
              🏆
            </div>
            <div>
              <h1 className="font-display text-2xl font-black" style={{ color: 'var(--color-text-primary)' }}>
                Trophy Room
              </h1>
              <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                {squad.name} · {achievements.length} trophies earned
              </p>
            </div>
          </div>

          {/* All-time stat */}
          <div className="rounded-2xl p-4 flex items-center justify-between"
            style={{ background: 'var(--color-surface)', border: `1px solid ${colour}40` }}>
            <div>
              <p className="text-3xl font-black font-data" style={{ color: colour }}>
                {fmtKm(alltimeKm)}km
              </p>
              <p className="text-[10px] uppercase tracking-wider mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
                All-time squad distance
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-black font-data" style={{ color: 'var(--color-text-primary)' }}>
                {achievements.length}
              </p>
              <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>
                Trophies
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 space-y-6">

        {/* Achievements */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wider mb-3"
            style={{ color: 'var(--color-text-tertiary)' }}>
            Achievements
          </p>

          {achievements.length === 0 ? (
            <div className="rounded-2xl p-8 text-center"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <div className="text-4xl mb-3">🏃</div>
              <p className="text-sm font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>
                No trophies yet
              </p>
              <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                Run together, hit goals, and complete plans to earn your first trophy.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {achievements.map(ach => {
                const meta = ACHIEVEMENT_META[ach.type] ?? {
                  icon: ach.icon ?? '🏆',
                  label: ach.type.replace(/_/g, ' '),
                  description: ach.description ?? '',
                }
                return (
                  <div key={ach.id} className="rounded-2xl p-4"
                    style={{ background: 'var(--color-surface)', border: `1px solid ${colour}30` }}>
                    <div className="text-3xl mb-2">{meta.icon}</div>
                    <p className="text-xs font-black mb-0.5" style={{ color: 'var(--color-text-primary)' }}>
                      {meta.label}
                    </p>
                    <p className="text-[10px] mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                      {meta.description}
                    </p>
                    <p className="text-[9px] font-data" style={{ color: 'var(--color-text-tertiary)' }}>
                      {fmtDate(ach.earned_at)}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Monthly seasons */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold uppercase tracking-wider"
              style={{ color: 'var(--color-text-tertiary)' }}>
              Monthly seasons
            </p>
            {!isPremium && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: `${colour}20`, color: colour }}>
                Premium
              </span>
            )}
          </div>

          {!isPremium ? (
            <div className="rounded-2xl p-5 text-center"
              style={{ background: 'var(--color-surface)', border: `1px solid ${colour}30` }}>
              <p className="text-2xl mb-2">📅</p>
              <p className="text-sm font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>
                Monthly season history
              </p>
              <p className="text-xs mb-4" style={{ color: 'var(--color-text-secondary)' }}>
                Upgrade to Premium to see monthly breakdowns, top runners, and goal streaks.
              </p>
              <Link href="/settings?upgrade=true"
                className="inline-block px-6 py-2.5 rounded-xl text-sm font-bold text-white"
                style={{ background: colour }}>
                Upgrade to Premium
              </Link>
            </div>
          ) : monthlySeasons.length === 0 ? (
            <div className="rounded-2xl p-5 text-center"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                Monthly snapshots appear at the end of each month.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {monthlySeasons.map(season => (
                <div key={season.id} className="rounded-2xl p-4"
                  style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
                      {fmtPeriod(season.period, season.season_type)}
                    </p>
                    {season.goal_hit && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: '#05966920', color: '#059669' }}>
                        🎯 Goal hit
                      </span>
                    )}
                  </div>
                  <div className="flex gap-4">
                    <div>
                      <p className="text-lg font-black font-data" style={{ color: colour }}>
                        {fmtKm(season.total_km)}km
                      </p>
                      <p className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>distance</p>
                    </div>
                    <div>
                      <p className="text-lg font-black font-data" style={{ color: 'var(--color-text-primary)' }}>
                        {season.total_sessions}
                      </p>
                      <p className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>sessions</p>
                    </div>
                    <div>
                      <p className="text-lg font-black font-data" style={{ color: 'var(--color-text-primary)' }}>
                        {season.active_members}
                      </p>
                      <p className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>runners</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Annual seasons */}
        {isPremium && annualSeasons.length > 0 && (
          <div>
            <p className="text-xs font-bold uppercase tracking-wider mb-3"
              style={{ color: 'var(--color-text-tertiary)' }}>
              Annual seasons
            </p>
            <div className="space-y-2">
              {annualSeasons.map(season => (
                <div key={season.id} className="rounded-2xl p-4"
                  style={{ background: 'var(--color-surface)', border: `1px solid ${colour}30` }}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
                      {season.period}
                    </p>
                    {season.goal_hit && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: '#05966920', color: '#059669' }}>
                        🎯 Goal hit
                      </span>
                    )}
                  </div>
                  <div className="flex gap-4">
                    <div>
                      <p className="text-2xl font-black font-data" style={{ color: colour }}>
                        {fmtKm(season.total_km)}km
                      </p>
                      <p className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>distance</p>
                    </div>
                    <div>
                      <p className="text-2xl font-black font-data" style={{ color: 'var(--color-text-primary)' }}>
                        {season.total_sessions}
                      </p>
                      <p className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>sessions</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </main>
  )
}
