-- BL-C2 — Allow reaction-only coach annotations.
--
-- The original session_annotations schema declared `note text NOT NULL`,
-- which blocks the 2-tap reaction surface (1 tap to open athlete, 1 tap to
-- send 🔥/💙/🧊/📞 with no typed note). The /api/coach/annotate route
-- early-returns 400 when note is absent — the UI silently fails and the
-- DB constraint would reject the insert anyway.
--
-- Fix: drop the NOT NULL on `note` and add a CHECK that requires either
-- `note` OR `reaction` so the row still carries a coach signal. Existing
-- rows already have `note` populated (it was required) so backfill is a
-- no-op.

ALTER TABLE public.session_annotations
  ALTER COLUMN note DROP NOT NULL;

ALTER TABLE public.session_annotations
  DROP CONSTRAINT IF EXISTS session_annotations_signal_present;

ALTER TABLE public.session_annotations
  ADD CONSTRAINT session_annotations_signal_present
  CHECK (note IS NOT NULL OR reaction IS NOT NULL);
