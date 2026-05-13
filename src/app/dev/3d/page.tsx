import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppHeader } from '@/components/AppHeader'
import Character3DPreviewClient from './Character3DPreviewClient'

// PR J9a — admin-gated 3D character preview page.
//
// Lives under /dev/3d (not /admin/3d) because it's a developer playground
// not an ops dashboard. Same email gate as /admin/* to keep it private
// while iterating on the character pipeline.

export const dynamic  = 'force-dynamic'
export const metadata = { title: '3D Character — NextSplit Dev' }

export default async function ThreeDPreviewPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  const adminEmails = (process.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim()).filter(Boolean)
  if (!adminEmails.includes(user.email ?? '')) redirect('/home')

  return (
    <>
      <AppHeader title="3D Character" subtitle="J9a foundation preview" />
      <Character3DPreviewClient />
    </>
  )
}
