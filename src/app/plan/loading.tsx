export default function PlanLoading() {
  return (
    <div className="min-h-screen pb-24">
      <div className="bg-white border-b border-[var(--color-border)] px-4 pt-12 pb-4">
        <div className="max-w-lg mx-auto">
          <div className="h-5 w-48 bg-[var(--color-surface-3)] rounded animate-pulse mb-1" />
          <div className="h-3 w-32 bg-[var(--color-surface-2)] rounded animate-pulse" />
        </div>
      </div>
      <div className="bg-white border-b border-[var(--color-border)] px-4 py-3">
        <div className="max-w-lg mx-auto">
          <div className="h-1.5 bg-[var(--color-surface-2)] rounded-full" />
        </div>
      </div>
      <div className="max-w-lg mx-auto px-4 py-5 space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-20 bg-white rounded-2xl border border-[var(--color-border)] animate-pulse" />
        ))}
      </div>
    </div>
  )
}
