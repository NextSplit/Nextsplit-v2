import { redirect } from 'next/navigation'

// Back-compat redirect — /coach/squad was the previous home of the
// dashboard. P3.1 promoted it to /coach so the BottomNav Coach tab
// actually lands somewhere. Existing redirects from /coach/athlete and
// /coach/setup that used to point here have been updated, but stray
// bookmarks + the route name in user muscle-memory still resolve.

export default function CoachSquadRedirect() {
  redirect('/coach')
}
