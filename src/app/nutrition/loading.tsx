export default function NutritionLoading() {
  return (
    <div className="min-h-screen pb-24">
      <div className="bg-white border-b border-[var(--color-border)] px-4 pt-12 pb-4">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div className="h-5 w-20 bg-[var(--color-surface-3)] rounded animate-pulse" />
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[var(--color-surface-2)] animate-pulse" />
            <div className="flex-1 h-8 bg-[var(--color-surface-2)] rounded animate-pulse" />
            <div className="w-8 h-8 rounded-full bg-[var(--color-surface-2)] animate-pulse" />
          </div>
        </div>
      </div>
      <div className="max-w-lg mx-auto px-4 py-4 space-y-3">
        <div className="h-16 bg-white rounded-2xl border border-[var(--color-border)] animate-pulse" />
        {[1, 2, 3].map(i => (
          <div key={i} className="h-20 bg-white rounded-2xl border border-[var(--color-border)] animate-pulse" />
        ))}
      </div>
    </div>
  )
}
