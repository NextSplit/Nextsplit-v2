export default function ProfileLoading() {
  return (
    <div className="min-h-screen pb-24">
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-5">
        <div className="max-w-lg mx-auto flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gray-200 animate-pulse" />
          <div className="flex-1">
            <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="h-3 w-48 bg-gray-100 rounded animate-pulse" />
          </div>
        </div>
      </div>
      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-24 bg-white rounded-2xl border border-gray-100 animate-pulse" />
        ))}
      </div>
    </div>
  )
}
