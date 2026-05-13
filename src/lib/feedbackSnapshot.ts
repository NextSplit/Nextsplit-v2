// PR J5 — Vercel toolbar feedback snapshot.
//
// The Vercel toolbar comments API is only reachable via Vercel's
// internal API (wrapped by the Vercel MCP). The runtime supabase-js
// client can't query it, so we snapshot the current threads into
// version control for the /admin/feedback page.
//
// To refresh:
//   1. In a Claude session, call
//      `mcp__vercel__list_toolbar_threads(teamId=team_C7COgxDlzndSCNtv6bGNENPF, status='unresolved')`
//   2. Update the `threads` array + `last_run` below.
//   3. To resolve/reply on a thread, use the MCP's
//      `reply_to_toolbar_thread` + `change_toolbar_thread_resolve_status`.

export interface FeedbackThread {
  id:           string
  page:         string             // URL path the comment was left on
  branch:       string | null
  message:      string
  author:       string
  created_at:   string             // ISO
  status:       'unresolved' | 'resolved'
  comment_count: number
}

export interface FeedbackSnapshot {
  last_run:        string
  team_id:         string
  unresolved:      FeedbackThread[]
  unresolved_count: number
}

export const feedbackSnapshot: FeedbackSnapshot = {
  last_run:         '2026-05-13',
  team_id:          'team_C7COgxDlzndSCNtv6bGNENPF',
  unresolved:       [],
  unresolved_count: 0,
}
