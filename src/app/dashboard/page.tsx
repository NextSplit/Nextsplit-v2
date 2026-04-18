import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { signout } from '@/app/auth/actions'
import type { Profile, UserPlan } from '@/types/database'

// /dashboard redirects to /today — keeping the old route for backward compat
// export { default } from '@/app/today/page'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  // Get profile — typed explicitly until schema is applied in Supabase
  const { data: profileData } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const profile = profileData as Profile | null

  // Get active plan
  const { data: activePlanData } = await supabase
    .from('user_plans')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const activePlan = activePlanData as UserPlan | null

  const displayName = profile?.display_name || user.email?.split('@')[0] || 'Runner'

  return (
    <main className="min-h-screen bg-[#f5f4f0]">
      {/* Header */}
      <div className="bg-white border-b border-[#e0e0e0] px-4 py-3 flex items-center justify-between">
        <span className="text-base font-bold text-[#1a1a1a]">NextSplit</span>
        <form action={signout}>
          <button type="submit" className="text-xs text-[#888] hover:text-[#555]">
            Sign out
          </button>
        </form>
      </div>

      <div className="px-4 py-6 max-w-lg mx-auto space-y-4">
        {/* Welcome */}
        <div>
          <h1 className="text-xl font-bold text-[#1a1a1a]">Good morning, {displayName}</h1>
          <p className="text-sm text-[#888] mt-0.5">
            {activePlan
              ? `Week ${activePlan.current_week} of ${activePlan.total_weeks}`
              : 'No active plan yet'}
          </p>
        </div>

        {/* No plan state */}
        {!activePlan && (
          <div className="bg-white rounded-2xl border border-[#e0e0e0] p-6 text-center">
            <div className="text-4xl mb-3">🏃</div>
            <h2 className="text-base font-semibold text-[#1a1a1a] mb-2">
              Let&apos;s set up your training plan
            </h2>
            <p className="text-sm text-[#888] mb-4">
              Choose from our plan library, generate an AI-bespoke plan, or build your own.
            </p>
            <a
              href="/onboarding"
              className="inline-block bg-[#1a1a1a] text-white px-6 py-3 rounded-xl text-sm font-semibold hover:bg-[#333] transition-colors"
            >
              Choose a plan →
            </a>
          </div>
        )}

        {/* Active plan card */}
        {activePlan && (
          <div className="bg-white rounded-2xl border border-[#e0e0e0] p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-xs text-[#888] mb-0.5 capitalize">{activePlan.plan_type.replace('_', ' ')}</div>
                <div className="text-sm font-semibold text-[#1a1a1a]">{activePlan.name}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-[#888]">Week</div>
                <div className="text-lg font-bold text-[#1a1a1a]">{activePlan.current_week}</div>
              </div>
            </div>
            <div className="h-1.5 bg-[#f0f0f0] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#1a1a1a] rounded-full transition-all"
                style={{ width: `${(activePlan.current_week / activePlan.total_weeks) * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-[#aaa] mt-1">
              <span>Week 1</span>
              <span>{activePlan.total_weeks} weeks total</span>
            </div>
          </div>
        )}

        {/* Coming soon */}
        <div className="bg-white rounded-2xl border border-[#e0e0e0] p-4 text-center py-8">
          <p className="text-sm text-[#aaa]">Today&apos;s sessions — coming soon</p>
          <p className="text-xs text-[#ccc] mt-1">Full training tracker in development</p>
        </div>
      </div>
    </main>
  )
}
