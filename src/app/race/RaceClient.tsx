'use client'

import { useTodayRace } from '@/hooks/useTodayRace'
import { RaceCard } from '@/components/race/RaceCard'
import { RaceResultReplay, type RaceTimelineRunner } from '@/components/race/RaceResultReplay'
import type { BuildClass } from '@/lib/character'

// /race surface — Phase 3+ Race tab.
// V1 scope: today's daily 5K only (entry CTA + result replay). Future races
// (weekly_marquee / monthly_major / on_demand_1v1 / squad_ekiden) get added
// as separate cards as their seeders + UX land.

export default function RaceClient() {
  const { data, loading } = useTodayRace()

  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--color-bg)' }}>
      <div
        className="max-w-lg mx-auto px-4 pt-12 pb-3 flex items-center justify-between"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1.5rem)' }}
      >
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--color-text-primary)' }}>
            Race
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-tertiary)' }}>
            Daily races built from your training.
          </p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 space-y-4">
        <RaceCard variant="full" />

        {/* Replay — only show when finalized result is available */}
        {!loading && data?.result && data.race && (
          <div
            className="rounded-2xl px-3 py-3"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            <p
              className="text-[10px] font-black uppercase tracking-widest mb-3 px-1"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              🎬 Replay
            </p>
            <RaceResultReplay
              runners={mergeForReplay(data.result.finishing_order, data.result.result_timeline)}
              distanceM={data.race.distance_m}
              selfUserId={data.me_user_id ?? undefined}
              runnerCosmetics={data.runner_cosmetics ?? {}}
            />
          </div>
        )}

        {/* Future-races teaser */}
        <div
          className="rounded-2xl px-4 py-4"
          style={{ background: 'var(--color-surface)', border: '1px dashed var(--color-border)' }}
        >
          <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--color-text-tertiary)' }}>
            Coming soon
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            Weekly marquee · Monthly majors · 1v1 challenges · Squad ekidens
          </p>
        </div>
      </div>
    </div>
  )
}

// Merge finishing_order + result_timeline into a single runner array shaped
// for RaceResultReplay (one entry per runner with rank, finish_secs, splits).
function mergeForReplay(
  finishingOrder: Array<{ user_id: string; build_class: string; finish_secs: number; rank: number }>,
  timeline:       Array<{ user_id: string; splits: number[] }>,
): RaceTimelineRunner[] {
  const splitsByUser = new Map(timeline.map(t => [t.user_id, t.splits]))
  return finishingOrder.map(f => ({
    user_id:     f.user_id,
    build_class: f.build_class as BuildClass,
    finish_secs: f.finish_secs,
    rank:        f.rank,
    splits:      splitsByUser.get(f.user_id) ?? Array(11).fill(0),
  }))
}
