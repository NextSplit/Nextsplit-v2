// PR J1 — Supabase advisor snapshot.
//
// Source: `mcp__supabase__get_advisors(project_id, 'security' | 'performance')`
// against project `wlrmeiczqgmharvfmalq`.
//
// The Supabase advisor API is only reachable via the Management API + a PAT
// (not via the runtime `supabase-js` client), so we snapshot the counts into
// version control instead of fetching live. To refresh:
//
//   1. Run `mcp__supabase__get_advisors` in a Claude session.
//   2. Update the counts + `last_run` date below.
//   3. Update HANDOFF.md with notable changes.
//
// /admin/health renders this snapshot as the "DB linter" card so a stale
// snapshot still serves as a baseline to compare against.

export interface AdvisorLintSummary {
  name:  string
  level: 'INFO' | 'WARN' | 'ERROR'
  count: number
  note?: string
}

export interface AdvisorSnapshot {
  last_run:        string
  project_id:      string
  security:        AdvisorLintSummary[]
  performance:     AdvisorLintSummary[]
  founder_actions: Array<{ id: string; description: string; remediation_url?: string }>
}

export const advisorSnapshot: AdvisorSnapshot = {
  last_run:   '2026-05-13',
  project_id: 'wlrmeiczqgmharvfmalq',
  security: [
    {
      name:  'authenticated_security_definer_function_executable',
      level: 'WARN',
      count: 34,
      note:  'Every SECURITY DEFINER RPC executable by authenticated. All hardened with auth.uid() guard + SET search_path = public, pg_temp per phase-rpc-hardening-v1 + phase-advisor-findings-v1. Benign by design.',
    },
    {
      name:  'anon_security_definer_function_executable',
      level: 'WARN',
      count: 28,
      note:  'SECURITY DEFINER RPCs executable by anon. Audit candidate but currently includes signup-path RPCs that legitimately need anon access.',
    },
    {
      name:  'function_search_path_mutable',
      level: 'WARN',
      count: 14,
      note:  'Functions without explicit SET search_path. 14 RPCs not yet hardened — next sweep after PR J1.',
    },
    {
      name:  'rls_enabled_no_policy',
      level: 'INFO',
      count: 1,
      note:  'public.cron_runs — service_role-only by design (no policy = no authenticated/anon access). Intentional.',
    },
    {
      name:  'auth_leaked_password_protection',
      level: 'WARN',
      count: 1,
      note:  'FOUNDER ACTION: enable in Supabase dashboard → Project Settings → Auth → Password Security.',
    },
  ],
  performance: [
    {
      name:  'multiple_permissive_policies',
      level: 'WARN',
      count: 161,
      note:  'Tables with overlapping permissive policies (OR-combined, slows reads). Highest-volume tables to triage first.',
    },
    {
      name:  'auth_rls_initplan',
      level: 'WARN',
      count: 91,
      note:  'RLS using auth.uid() inline vs (select auth.uid()) — Postgres pre-computes the select form once per query. Mechanical fix.',
    },
    {
      name:  'unindexed_foreign_keys',
      level: 'INFO',
      count: 48,
      note:  'FK columns without indexes. Most are write-only — indexing is decorative until a CASCADE delete or join surfaces them.',
    },
    {
      name:  'unused_index',
      level: 'INFO',
      count: 28,
      note:  'Indexes not used in recent query patterns. Drop candidates after a longer observation window.',
    },
    {
      name:  'duplicate_index',
      level: 'WARN',
      count:  2,
      note:  'Literal duplicates — safe drop candidates.',
    },
  ],
  founder_actions: [
    {
      id:              'auth_leaked_password_protection',
      description:     'Enable HaveIBeenPwned leak protection in Supabase Auth',
      remediation_url: 'https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection',
    },
  ],
}
