import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { signout } from '@/app/auth/actions'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const profileData = profile as import('@/types/database').Profile | null
  const displayName = profileData?.display_name || user.email?.split('@')[0] || 'Runner'

  return (
    <div className="min-h-screen bg-[#f8f8f6] pb-24">
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-4">
        <div className="max-w-lg mx-auto">
          <h1 className="text-lg font-bold text-gray-900">Profile</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">
        {/* Avatar */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-[#0D9488] flex items-center justify-center text-2xl text-white font-bold">
            {displayName[0].toUpperCase()}
          </div>
          <div>
            <div className="text-base font-bold text-gray-900">{displayName}</div>
            <div className="text-sm text-gray-400">{user.email}</div>
          </div>
        </div>

        {/* Stats placeholder */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Your stats</h2>
          <p className="text-xs text-gray-400">More features coming soon — XP, badges, race history.</p>
        </div>

        {/* Sign out */}
        <form action={signout}>
          <button
            type="submit"
            className="w-full py-3 rounded-2xl border border-red-200 text-red-500 text-sm font-semibold bg-white"
          >
            Sign out
          </button>
        </form>
      </div>
    </div>
  )
}
