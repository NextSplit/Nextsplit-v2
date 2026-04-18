import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function StatsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  return (
    <div className="min-h-screen bg-[#f8f8f6] pb-24">
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-4">
        <div className="max-w-lg mx-auto">
          <h1 className="text-lg font-bold text-gray-900">Stats</h1>
          <p className="text-xs text-gray-400 mt-0.5">Training analytics</p>
        </div>
      </div>
      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
          <div className="text-5xl mb-4">📊</div>
          <h2 className="text-base font-bold text-gray-900 mb-2">Analytics coming in Phase 2</h2>
          <p className="text-sm text-gray-400 leading-relaxed">
            ACWR chart, pace trends, injury risk score, weekly volume, and more.
            Log some sessions first!
          </p>
        </div>
      </div>
    </div>
  )
}
