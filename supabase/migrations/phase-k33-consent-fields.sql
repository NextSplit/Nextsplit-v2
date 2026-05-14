-- ─── Phase K33 — Consent fields on profiles ─────────────────────────────────
-- Council /council K33 P0: Google OAuth bypasses clickwrap entirely.
-- Under UK CCR 2013 reg 37 the 14-day cancellation right must be
-- expressly waived by the consumer before a digital subscription
-- begins, and under UK GDPR the consent moment must be auditable.
--
-- These columns capture the moment a user accepts the Terms +
-- Privacy Policy AND confirms they are 16 or older. Both are
-- required for any path that creates an account, including OAuth.

begin;

alter table public.profiles
  add column if not exists terms_accepted_at  timestamptz,
  add column if not exists terms_version      integer,
  add column if not exists age_confirmed_at   timestamptz;

comment on column public.profiles.terms_accepted_at is
  'When the user last accepted the Terms + Privacy Policy. NULL means the user has not yet accepted the current version and must be routed through /auth/accept-terms before continuing.';
comment on column public.profiles.terms_version is
  'Schema version of the terms the user accepted. Bump to force a re-accept (e.g. on material legal updates).';
comment on column public.profiles.age_confirmed_at is
  'When the user confirmed they are 16 or older. NULL means the user has not yet confirmed and must be blocked from creating an account.';

create index if not exists profiles_terms_accepted_at_idx
  on public.profiles (terms_accepted_at)
  where terms_accepted_at is null;

commit;
