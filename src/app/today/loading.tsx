export default function TodayLoading() {
  return (
    <div className="min-h-screen bg-[#f8f8f6] pb-24">
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-4">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div className="h-5 w-24 bg-gray-200 rounded animate-pulse" />
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-100 animate-pulse" />
            <div className="flex-1 h-8 bg-gray-100 rounded animate-pulse" />
            <div className="w-8 h-8 rounded-full bg-gray-100 animate-pulse" />
          </div>
        </div>
      </div>
      <div className="max-w-lg mx-auto px-4 py-5 space-y-3">
        {[1, 2].map(i => (
          <div key={i} className="h-24 bg-white rounded-2xl border border-gray-100 animate-pulse" />
        ))}
      </div>
    </div>
  )
}
