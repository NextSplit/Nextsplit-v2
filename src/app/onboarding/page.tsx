import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function OnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  return (
    <main className="min-h-screen bg-[#1a1a1a] flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="text-center mb-10">
          <div className="text-5xl mb-4">🏃</div>
          <h1 className="text-3xl font-bold text-white tracking-tight">NextSplit</h1>
          <p className="text-[#555] text-sm mt-2">Choose how you want to train</p>
        </div>

        {/* Three main paths */}
        <div className="space-y-3 mb-6">
          {/* Predetermined plan */}
          <Link
            href="/onboarding/predetermined"
            className="block bg-white rounded-2xl p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="text-2xl">📋</div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-[#1a1a1a]">Structured plan</div>
                <div className="text-xs text-[#888] mt-0.5">
                  Expert-designed plans from 5k to 100 miles. Pick your goal and race date.
                </div>
              </div>
              <div className="text-[#ccc]">›</div>
            </div>
          </Link>

          {/* AI bespoke */}
          <Link
            href="/onboarding/ai"
            className="block bg-white rounded-2xl p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="text-2xl">🤖</div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-[#1a1a1a]">AI bespoke plan</div>
                <div className="text-xs text-[#888] mt-0.5">
                  Fully personalised. Set your goal races, schedule and constraints — we generate everything.
                </div>
              </div>
              <div className="text-[#ccc]">›</div>
            </div>
          </Link>

          {/* Manual */}
          <Link
            href="/onboarding/manual"
            className="block bg-white rounded-2xl p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="text-2xl">✏️</div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-[#1a1a1a]">Build your own</div>
                <div className="text-xs text-[#888] mt-0.5">
                  For experienced runners who write their own sessions. Use the app to track and analyse.
                </div>
              </div>
              <div className="text-[#ccc]">›</div>
            </div>
          </Link>

          {/* Lifestyle */}
          <Link
            href="/onboarding/lifestyle"
            className="block bg-white rounded-2xl p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="text-2xl">🌿</div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-[#1a1a1a]">Lifestyle training</div>
                <div className="text-xs text-[#888] mt-0.5">
                  No race goals. Train for fitness, health and consistency on your terms.
                </div>
              </div>
              <div className="text-[#ccc]">›</div>
            </div>
          </Link>
        </div>

        <Link
          href="/today"
          className="block text-center text-xs text-[#444] hover:text-[#666] py-2"
        >
          Skip for now — set up later
        </Link>
      </div>
    </main>
  )
}
