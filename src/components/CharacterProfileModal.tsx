'use client'

/**
 * CharacterProfileModal — Character System Spec:
 * "Viewing any user's profile shows their Character — not a stats table or a profile form.
 *  The Character IS the profile."
 *
 * Shows when a runner taps a squadmate on the leaderboard or squad view.
 */

import { useState, useEffect } from 'react'
import { RUNNER_CLASSES, renderCharSVG } from '@/lib/rpg'
import type { RunnerClassId } from '@/lib/rpg'
import { RunnerClassAvatar } from '@/components/avatars/RunnerClassAvatars'
interface AthleteCharacter {
  userId:      string
  displayName: string
  handle?:     string
  runnerClass: RunnerClassId | null
  level:       number
  xp:          number
  totalKm:     number
  totalRuns:   number
  streak:      number
  recentBadges?: string[]
}

interface Props {
  userId: string
  displayName: string
  handle?: string
  onClose: () => void
}

export default function CharacterProfileModal({ userId, displayName, handle, onClose }: Props) {
  const [athlete, setAthlete]   = useState<AthleteCharacter | null>(null)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    fetch(`/api/profile/character?user_id=${userId}`)
      .then(r => r.json())
      .then(d => { if (d.character) setAthlete(d.character) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [userId])

  const cls = athlete?.runnerClass
    ? RUNNER_CLASSES[athlete.runnerClass]
    : RUNNER_CLASSES['warming_up']

  const avatarSvg = renderCharSVG(
    '1',
    athlete?.level ?? 1,
    96,
    96,
    cls?.colour ?? '#2b5c3f',
  )

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl max-w-lg mx-auto">
        <div className="px-5 pt-5 pb-8">
          <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />

          {loading ? (
            <div className="flex justify-center py-10">
              <div className="w-6 h-6 rounded-full border-2 border-gray-200 border-t-[var(--ns-forest)] animate-spin" />
            </div>
          ) : (
            <>
              {/* Character display — primary identity surface */}
              <div className="flex flex-col items-center text-center mb-5">
                {/* Avatar SVG — class-specific illustrated avatar */}
                <div className="w-24 h-24 mb-3">
                  <RunnerClassAvatar
                    classId={athlete?.runnerClass}
                    size={96}
                  />
                </div>

                {/* Class badge */}
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-2 ${cls.bg} ${cls.textColour}`}>
                  <span>{cls.emoji}</span>
                  <span>{cls.name}</span>
                </div>

                {/* Name */}
                <h2 className="text-lg font-black text-gray-900">
                  {displayName}
                </h2>
                {handle && (
                  <p className="text-xs text-gray-400">@{handle}</p>
                )}

                {/* Level */}
                {athlete && (
                  <p className="text-xs text-gray-400 mt-1">
                    Level {athlete.level} · {athlete.xp} XP
                  </p>
                )}
              </div>

              {/* Stats grid — secondary, not primary */}
              {athlete && (
                <div className="grid grid-cols-3 gap-2 mb-5">
                  {[
                    { label: 'Total km', value: `${Math.round(athlete.totalKm)}km` },
                    { label: 'Sessions',  value: athlete.totalRuns },
                    { label: 'Streak',    value: athlete.streak > 0 ? `🔥${athlete.streak}` : '—' },
                  ].map(s => (
                    <div key={s.label} className="bg-gray-50 rounded-xl p-3 text-center">
                      <p className="text-sm font-bold text-gray-900">{s.value}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Class description */}
              {athlete?.runnerClass && athlete.runnerClass !== 'warming_up' && (
                <div className={`rounded-2xl p-4 mb-5 ${cls.bg}`}>
                  <p className={`text-xs leading-relaxed ${cls.textColour}`}>
                    {cls.description}
                  </p>
                </div>
              )}

              <button
                onClick={onClose}
                className="w-full py-3 rounded-2xl border border-gray-200 text-sm font-semibold text-gray-600"
              >
                Close
              </button>
            </>
          )}
        </div>
      </div>
    </>
  )
}
