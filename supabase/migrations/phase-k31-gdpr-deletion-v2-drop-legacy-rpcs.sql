-- K31 follow-up — drop the legacy delete + export RPCs.
--
-- These functions predated the GDPR audit trail introduced in v1 of
-- this phase. While the SettingsClient now calls /api/account/* (which
-- writes account_lifecycle_events and enforces the 30-day grace),
-- leaving the RPCs in the DB lets any stale client or direct PostgREST
-- caller bypass both protections.
--
-- The drop is safe because:
--   • SettingsClient was updated in v1 to call the API routes
--   • No other client surface calls these RPCs (verified via grep)
--   • A direct call from the Supabase dashboard's SQL editor is fine —
--     that's a deliberate admin action, not an end-user surface
--
-- If a future flow needs to perform an audit-bypass deletion (e.g.
-- a verified hard delete after the grace period elapses), it should
-- use the auth.admin.deleteUser RPC directly from the service-role
-- client, which is what /api/cron/process-deletions already does.

begin;

drop function if exists public.delete_user_account(uuid);
drop function if exists public.delete_user_account();
drop function if exists public.export_user_data(uuid);
drop function if exists public.export_user_data();

commit;
