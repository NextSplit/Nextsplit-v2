export default function StatsLoading() {
  return (
    <div className="min-h-screen bg-[#f8f8f6] pb-24">
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-3">
        <div className="max-w-lg mx-auto">
          <div className="h-5 w-16 bg-gray-200 rounded animate-pulse mb-3" />
          <div className="flex gap-1">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex-1 h-7 bg-gray-100 rounded-full animate-pulse" />
            ))}
          </div>
        </div>
      </div>
      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-32 bg-white rounded-2xl border border-gray-100 animate-pulse" />
        ))}
      </div>
    </div>
  )
}
