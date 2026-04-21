'use client'

import { getRunnerClass, RUNNER_CLASSES } from '@/lib/rpg'
import type { RunnerClassId } from '@/lib/rpg'

interface RunnerClassCardProps {
  classId: RunnerClassId | null | undefined
  revealReady?: boolean
  compact?: boolean        // for squad dashboard rows
  showDescription?: boolean
  onRevealClick?: () => void
}

export default function RunnerClassCard({
  classId,
  revealReady = false,
  compact = false,
  showDescription = false,
  onRevealClick,
}: RunnerClassCardProps) {
  const cls = getRunnerClass(classId)
  const isWarming = !classId || classId === 'warming_up'
  const isPending = isWarming && !revealReady

  // Compact mode — for coach squad dashboard rows
  if (compact) {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${cls.bg} ${cls.textColour}`}>
        <span>{cls.emoji}</span>
        <span>{isPending ? 'Building…' : cls.name}</span>
      </div>
    )
  }

  // Full card — for HeroCard / Character tab
  return (
    <div className={`rounded-2xl border ${cls.bg} overflow-hidden`}
      style={{ borderColor: `${cls.colour}30` }}>

      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase"
            style={{ color: `${cls.colour}99` }}>
            Runner Class
          </p>
          {isPending && (
            <span className="text-[10px] text-gray-400 bg-white/60 px-2 py-0.5 rounded-full">
              {`Building…`}
            </span>
          )}
          {!isPending && isWarming && revealReady && (
            <button
              onClick={onRevealClick}
              className="text-[10px] font-bold text-white px-2.5 py-0.5 rounded-full animate-pulse"
              style={{ background: cls.colour }}
            >
              Reveal ✨
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-4xl">{cls.emoji}</span>
          <div>
            <h3 className="text-lg font-black" style={{ color: cls.colour }}>
              {isPending ? 'Warming Up' : cls.name}
            </h3>
            <p className={`text-xs font-medium ${cls.textColour} opacity-80`}>
              {isPending ? 'Training for 4 weeks reveals your class' : cls.tagline}
            </p>
          </div>
        </div>
      </div>

      {/* Description — optional */}
      {showDescription && !isPending && (
        <div className="px-4 pb-4">
          <p className={`text-xs leading-relaxed ${cls.textColour} opacity-70`}>
            {cls.description}
          </p>
        </div>
      )}

      {/* Progress bar for warming_up — shows how close to reveal */}
      {isPending && (
        <div className="px-4 pb-4">
          <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-slate-400 rounded-full transition-all duration-700"
              style={{ width: '0%' }} // Could hook up to real progress later
            />
          </div>
          <p className="text-[10px] text-gray-400 mt-1.5">
            Keep logging sessions — your class reveals after 4 weeks
          </p>
        </div>
      )}

      {/* All classes — for reference when not pending */}
      {!isPending && (
        <div className="px-4 pb-4">
          <div className="flex flex-wrap gap-1.5">
            {(Object.values(RUNNER_CLASSES) as typeof RUNNER_CLASSES[keyof typeof RUNNER_CLASSES][])
              .filter(c => c.id !== 'warming_up')
              .map(c => (
                <span
                  key={c.id}
                  className={`text-[10px] px-2 py-0.5 rounded-full ${
                    c.id === classId
                      ? 'font-bold'
                      : 'opacity-40'
                  } ${cls.bg} ${cls.textColour}`}
                  style={c.id === classId ? { background: `${cls.colour}20`, color: cls.colour } : {}}
                >
                  {c.emoji} {c.name}
                </span>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
