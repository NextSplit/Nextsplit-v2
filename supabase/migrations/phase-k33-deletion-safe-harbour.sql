-- ─── Phase K33 — Deletion safe-harbour & schema reconciliation ──────────────
--
-- Council /council K33 surfaced two operational gaps that the privacy
-- policy and the K31 deletion flow cannot satisfy in their current
-- form:
--
--   1. coach_earnings.coach_id and coaching_subscriptions.coach_id /
--      athlete_id were declared ON DELETE CASCADE referencing
--      auth.users(id). HMRC retention (Finance Act 2007 / Companies
--      Act s.386) requires that financial records survive a user
--      deletion for 6 years. The CASCADE silently destroys evidence
--      we are legally required to keep.
--
--   2. account_lifecycle_events.user_id was declared ON DELETE CASCADE
--      against auth.users. The whole point of that table (K31) is to
--      retain the audit trail of deletion + export requests for ICO
--      evidence. The CASCADE makes the audit trail self-erasing the
--      moment we honour an erasure request.
--
--   3. coach_athletes.share_body_weight is written by the
--      /api/coach/accept route but the column was never added to the
--      schema. The default behaviour is therefore undefined: under
--      Postgres the INSERT will error if the column is missing,
--      under generated-types drift it will compile but the row will
--      have no body-weight consent flag.
--
-- Fix:
--   - Drop the dangerous FK constraints on financial + audit tables.
--     Keep the columns as plain uuid so the value persists across
--     user deletion; downstream code must accept NULL or a "ghost"
--     user_id for deleted accounts.
--   - Add anonymised_at timestamptz to financial tables so the
--     deletion path can mark records as "PII-stripped, financial-fact
--     retained" without dropping the row.
--   - Add share_body_weight column to coach_athletes with default
--     FALSE, matching the privacy policy commitment ("off by
--     default").
--   - Provide anonymise_user_financial_records(p_user_id) which the
--     deletion cron will call before the auth.users delete. It nulls
--     the user-identifying columns and stamps anonymised_at; the
--     financial fields (amounts, Stripe transfer IDs, period_month)
--     are preserved.
--
-- Not in this migration (separate commits):
--   - Updating the deletion cron to call anonymise_user_financial_records
--   - Updating the export RPC / API route to be table-complete
--   - The /api/coach/accept change to write share_body_weight from a
--     user-supplied default (currently hardcoded TRUE in the route —
--     that's a separate finding the council also flagged).

begin;

-- ── 1. coach_earnings ──────────────────────────────────────────────────────
alter table public.coach_earnings
  add column if not exists anonymised_at timestamptz;

alter table public.coach_earnings
  drop constraint if exists coach_earnings_coach_id_fkey;

alter table public.coach_earnings
  drop constraint if exists coach_earnings_athlete_id_fkey;

comment on column public.coach_earnings.coach_id is
  'Coach user id. No FK to auth.users — HMRC requires 6-year retention; the value persists after user deletion.';
comment on column public.coach_earnings.athlete_id is
  'Athlete user id. Same retention rationale as coach_id.';
comment on column public.coach_earnings.anonymised_at is
  'Set by anonymise_user_financial_records when one of the referenced users requests deletion. The financial fact (amounts, transfer id, period) remains for HMRC.';

-- ── 2. coaching_subscriptions ──────────────────────────────────────────────
alter table public.coaching_subscriptions
  add column if not exists anonymised_at timestamptz;

alter table public.coaching_subscriptions
  drop constraint if exists coaching_subscriptions_coach_id_fkey;

alter table public.coaching_subscriptions
  drop constraint if exists coaching_subscriptions_athlete_id_fkey;

comment on column public.coaching_subscriptions.coach_id is
  'Coach user id. No FK — HMRC 6-year retention.';
comment on column public.coaching_subscriptions.athlete_id is
  'Athlete user id. Same retention rationale.';

-- ── 3. account_lifecycle_events (K31 audit trail) ─────────────────────────
alter table public.account_lifecycle_events
  drop constraint if exists account_lifecycle_events_user_id_fkey;

comment on column public.account_lifecycle_events.user_id is
  'User id snapshot. No FK — audit trail must survive the deletion it records.';

-- ── 4. coach_athletes.share_body_weight ───────────────────────────────────
-- Council found this column is written by /api/coach/accept but the
-- migration history never declared it. Add it now with the default
-- the privacy policy promises ("off by default").
alter table public.coach_athletes
  add column if not exists share_body_weight boolean not null default false;

comment on column public.coach_athletes.share_body_weight is
  'Coach can read athlete weight logs when true. Defaults to false per privacy policy.';

-- ── 5. anonymisation function ─────────────────────────────────────────────
-- Called by the deletion cron immediately before auth.admin.deleteUser.
-- Nulls user-identifying columns on financial rows; preserves the
-- financial fact. Marks anonymised_at so the deletion is recoverable
-- as "PII-stripped" rather than "row missing".
create or replace function public.anonymise_user_financial_records(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.coach_earnings
     set coach_id      = null,
         athlete_id    = case when athlete_id = p_user_id then null else athlete_id end,
         anonymised_at = coalesce(anonymised_at, now())
   where coach_id = p_user_id;

  update public.coach_earnings
     set athlete_id    = null,
         anonymised_at = coalesce(anonymised_at, now())
   where athlete_id = p_user_id;

  update public.coaching_subscriptions
     set coach_id      = case when coach_id   = p_user_id then null else coach_id   end,
         athlete_id    = case when athlete_id = p_user_id then null else athlete_id end,
         anonymised_at = coalesce(anonymised_at, now())
   where coach_id = p_user_id or athlete_id = p_user_id;

  -- Feedback table: K31 RLS keeps user_id on ON DELETE SET NULL, but the
  -- message + user_agent columns may contain identifying content. Null
  -- them too so the row is fully anonymised, not partly.
  update public.feedback
     set message     = null,
         user_agent  = null
   where user_id = p_user_id;
end;
$$;

comment on function public.anonymise_user_financial_records(uuid) is
  'Call BEFORE auth.admin.deleteUser. Nulls PII-bearing columns on '
  'coach_earnings, coaching_subscriptions, and feedback while '
  'preserving the financial fact (amounts, dates, Stripe transfer ids) '
  'for the HMRC 6-year retention window.';

-- Service role only.
revoke all on function public.anonymise_user_financial_records(uuid) from public;
grant execute on function public.anonymise_user_financial_records(uuid) to service_role;

commit;
