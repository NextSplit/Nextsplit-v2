import { redirect } from 'next/navigation'

// R1 — /community contents resurrected as the "Discover" tab of /squad.
// This redirect preserves any existing inbound links (notifications,
// bookmarks, share cards) and points them at the new home.
export default function CommunityPage() {
  redirect('/squad?tab=discover')
}
