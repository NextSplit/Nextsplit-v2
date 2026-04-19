'use client'

interface Props {
  current: number  // 1-based
  total: number
  onBack?: () => void
}

export default function OnboardingProgress({ current, total, onBack }: Props) {
  return (
    <div className="flex items-center gap-3 mb-8">
      <button
        onClick={onBack}
        className="text-zinc-400 text-sm font-medium flex items-center gap-1 shrink-0"
        aria-label="Go back"
      >
        ← Back
      </button>
      <div className="flex-1 flex gap-1">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className="h-1 flex-1 rounded-full transition-all duration-300"
            style={{
              background: i < current ? '#0D9488' : 'rgba(255,255,255,0.12)',
            }}
          />
        ))}
      </div>
      <span className="text-xs text-zinc-500 shrink-0">{current}/{total}</span>
    </div>
  )
}
