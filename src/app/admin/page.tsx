import { redirect } from 'next/navigation'

// PR J11a follow-on — admin index. Redirects to /admin/health (the
// canonical landing page for the admin pane). Catches /admin and
// /admin/ — both used to throw "Something went wrong" since no page
// existed at the bare path.

export const dynamic = 'force-dynamic'

export default function AdminIndex() {
  redirect('/admin/health')
}
