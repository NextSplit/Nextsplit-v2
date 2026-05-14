-- K33 — extend account_lifecycle_events.event_type to include
-- 'terms_accepted'. The K31 CHECK constraint was limited to deletion
-- + export events; the consent moment at sign-up needs its own audit
-- type so an ICO investigation can verify when consent was captured.

begin;

alter table public.account_lifecycle_events
  drop constraint if exists account_lifecycle_events_event_type_check;

alter table public.account_lifecycle_events
  add constraint account_lifecycle_events_event_type_check
  check (event_type in (
    'deletion_requested',
    'deletion_cancelled',
    'deletion_processed',
    'export_requested',
    'terms_accepted'
  ));

commit;
