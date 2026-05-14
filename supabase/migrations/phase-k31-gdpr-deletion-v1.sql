-- K31 — GDPR account deletion + export audit trail.
--
-- Pre-alpha launch gate: UK ICO + EU GDPR require self-service account
-- deletion with a grace period and a record of who-asked-what-when.
--
-- Approach:
--   • profiles gains two nullable timestamptz columns:
--       deletion_requested_at  — when the user clicked "Delete account"
--       deletion_processed_at  — when the daily cron actually deleted
--   • account_lifecycle_events records every request/cancel/export with
--     IP + user-agent for audit. Append-only, RLS-locked to service_role.
--   • A user with deletion_requested_at IS NOT NULL is logically deleted
--     from the user's perspective — the API + UI hide their data until
--     they cancel. The 30-day grace window lets them recover.
--
-- The cron job that processes deletions lives at
-- /api/cron/process-deletions and is wired into Inngest in
-- src/inngest/functions.ts.

begin;

-- ─── 1. profiles columns ───────────────────────────────────────────────────────

alter table public.profiles
  add column if not exists deletion_requested_at timestamptz,
  add column if not exists deletion_processed_at timestamptz;

comment on column public.profiles.deletion_requested_at is
  'User requested account deletion at this time. 30-day grace before the daily cron hard-deletes.';
comment on column public.profiles.deletion_processed_at is
  'Set by the deletion cron once the auth user + cascade has been processed. Soft-tombstone for audit.';

-- Index supporting the daily cron scan.
create index if not exists profiles_deletion_requested_at_idx
  on public.profiles (deletion_requested_at)
  where deletion_requested_at is not null;

-- ─── 2. account_lifecycle_events ───────────────────────────────────────────────

create table if not exists public.account_lifecycle_events (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  event_type   text not null check (event_type in (
                 'deletion_requested',
                 'deletion_cancelled',
                 'deletion_processed',
                 'export_requested'
               )),
  ip_address   inet,
  user_agent   text,
  metadata     jsonb default '{}'::jsonb,
  created_at   timestamptz not null default now()
);

create index if not exists account_lifecycle_events_user_idx
  on public.account_lifecycle_events (user_id, created_at desc);

comment on table public.account_lifecycle_events is
  'GDPR audit trail. Append-only. Records every deletion/export request with IP + UA.';

-- RLS: service_role only. Users do not read their own audit trail (it
-- contains IP/UA which we do not surface to them anyway).
alter table public.account_lifecycle_events enable row level security;

create policy "Service role full access"
  on public.account_lifecycle_events
  as permissive
  for all
  to service_role
  using (true)
  with check (true);

commit;
