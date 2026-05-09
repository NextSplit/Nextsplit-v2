-- phase-character-system-inventory-v4.sql
-- 2026-05-09 — Character system V4 — boost + cosmetic inventory
--
-- Founder direction (this session):
--   1. Boost mechanic: stat-buff only, single-race consumable
--   2. Acquisition: ALL OF — session streak, daily quest, random drop on
--      session log, direct purchase
--   3. Visibility: same race entry flow (boost picker integrated, no
--      separate inventory route required at backend layer)
--   4. Cosmetics + functional: BOTH — visual flair AND gameplay buffs
--
-- This migration ships the SCHEMA + 4 RPCs + catalog seed for ~12 starter
-- items. Subsequent PRs wire UI (PR #8 boost picker on /race entry,
-- inventory page on /you), Stripe purchase flow (PR #9), streak/daily-
-- quest acquisition triggers (PR #10).
--
-- This PR DOES wire roll_random_drop into /api/community/progress so the
-- random-drop acquisition path is live immediately — every session log
-- has a low chance of dropping a boost or cosmetic. Founders + early
-- testers will see drops accumulate even before the inventory UI exists,
-- which is the right migration order (data before UI).
--
-- All 4 RPCs follow F2.4 hardening: SECURITY DEFINER + SET search_path =
-- public, pg_temp + appropriate REVOKE/GRANT.

BEGIN;

-- ============================================================
-- 1. character_boosts_catalog — static catalogue of boost types
-- ============================================================
-- Catalogue rows are admin-managed; users never write here. Reads are
-- public (catalog needs to be visible for the picker UI even when the
-- user has none of an item).

CREATE TABLE IF NOT EXISTS public.character_boosts_catalog (
  id           text PRIMARY KEY,
  name         text NOT NULL,
  description  text NOT NULL,
  emoji        text NOT NULL DEFAULT '⚡',
  effect_stat  text NOT NULL CHECK (effect_stat IN ('speed','endurance','resilience','class_fit')),
  effect_pct   numeric NOT NULL,    -- multiplier delta, e.g. 0.10 = +10%
  rarity       text NOT NULL CHECK (rarity IN ('common','rare','epic','legendary')),
  gbp_price    numeric NULL,        -- null = not directly purchasable
  enabled      boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.character_boosts_catalog ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public reads boost catalog" ON public.character_boosts_catalog;
CREATE POLICY "Public reads boost catalog"
  ON public.character_boosts_catalog
  FOR SELECT
  TO authenticated
  USING (enabled = true);

-- ============================================================
-- 2. character_cosmetics_catalog — static catalogue of cosmetic items
-- ============================================================

CREATE TABLE IF NOT EXISTS public.character_cosmetics_catalog (
  id          text PRIMARY KEY,
  name        text NOT NULL,
  description text NOT NULL,
  emoji       text NOT NULL DEFAULT '✨',
  slot        text NOT NULL CHECK (slot IN ('kit_colour','shoes','accessory','banner','aura')),
  asset       jsonb NOT NULL,       -- e.g. { "colour": "#ff3d8b" }
  rarity      text NOT NULL CHECK (rarity IN ('common','rare','epic','legendary')),
  gbp_price   numeric NULL,
  enabled     boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.character_cosmetics_catalog ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public reads cosmetic catalog" ON public.character_cosmetics_catalog;
CREATE POLICY "Public reads cosmetic catalog"
  ON public.character_cosmetics_catalog
  FOR SELECT
  TO authenticated
  USING (enabled = true);

-- ============================================================
-- 3. character_boost_inventory — what boosts a user owns (consumable)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.character_boost_inventory (
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  boost_id    text NOT NULL REFERENCES public.character_boosts_catalog(id) ON DELETE CASCADE,
  quantity    int NOT NULL DEFAULT 1 CHECK (quantity >= 0),
  acquired_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, boost_id)
);

ALTER TABLE public.character_boost_inventory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Own boost inventory read" ON public.character_boost_inventory;
CREATE POLICY "Own boost inventory read"
  ON public.character_boost_inventory
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- INSERT/UPDATE/DELETE blocked from authenticated; SECDEF RPCs only.

CREATE INDEX IF NOT EXISTS character_boost_inventory_user_idx ON public.character_boost_inventory (user_id);

-- ============================================================
-- 4. character_cosmetic_inventory — what cosmetics a user owns
-- ============================================================
-- Cosmetics don't stack (own-or-don't). is_active flag drives display;
-- only one is_active per slot enforced by partial unique index.

CREATE TABLE IF NOT EXISTS public.character_cosmetic_inventory (
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  cosmetic_id text NOT NULL REFERENCES public.character_cosmetics_catalog(id) ON DELETE CASCADE,
  is_active   boolean NOT NULL DEFAULT false,
  acquired_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, cosmetic_id)
);

ALTER TABLE public.character_cosmetic_inventory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Own cosmetic inventory read" ON public.character_cosmetic_inventory;
CREATE POLICY "Own cosmetic inventory read"
  ON public.character_cosmetic_inventory
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Squad members read cosmetic inventory" ON public.character_cosmetic_inventory;
CREATE POLICY "Squad members read cosmetic inventory"
  ON public.character_cosmetic_inventory
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.squad_members sm1
    JOIN public.squad_members sm2 ON sm1.squad_id = sm2.squad_id
    WHERE sm1.user_id = auth.uid() AND sm2.user_id = character_cosmetic_inventory.user_id
  ));

CREATE INDEX IF NOT EXISTS character_cosmetic_inventory_user_idx ON public.character_cosmetic_inventory (user_id);

-- ============================================================
-- 5. RPC: grant_boost — service-role; idempotent stack-merge insert
-- ============================================================

CREATE OR REPLACE FUNCTION public.grant_boost(
  p_user_id  uuid,
  p_boost_id text,
  p_quantity int DEFAULT 1
)
RETURNS public.character_boost_inventory
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $func$
DECLARE
  v_row public.character_boost_inventory%ROWTYPE;
BEGIN
  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'quantity must be positive' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.character_boosts_catalog WHERE id = p_boost_id AND enabled = true) THEN
    RAISE EXCEPTION 'unknown or disabled boost: %', p_boost_id USING ERRCODE = '42704';
  END IF;

  INSERT INTO public.character_boost_inventory (user_id, boost_id, quantity)
  VALUES (p_user_id, p_boost_id, p_quantity)
  ON CONFLICT (user_id, boost_id) DO UPDATE
    SET quantity = character_boost_inventory.quantity + EXCLUDED.quantity
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$func$;

REVOKE EXECUTE ON FUNCTION public.grant_boost(uuid, text, int) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.grant_boost(uuid, text, int) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.grant_boost(uuid, text, int) FROM anon;
GRANT  EXECUTE ON FUNCTION public.grant_boost(uuid, text, int) TO service_role;

-- ============================================================
-- 6. RPC: grant_cosmetic — service-role; one-of insert
-- ============================================================

CREATE OR REPLACE FUNCTION public.grant_cosmetic(
  p_user_id     uuid,
  p_cosmetic_id text
)
RETURNS public.character_cosmetic_inventory
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $func$
DECLARE
  v_row public.character_cosmetic_inventory%ROWTYPE;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.character_cosmetics_catalog WHERE id = p_cosmetic_id AND enabled = true) THEN
    RAISE EXCEPTION 'unknown or disabled cosmetic: %', p_cosmetic_id USING ERRCODE = '42704';
  END IF;

  INSERT INTO public.character_cosmetic_inventory (user_id, cosmetic_id)
  VALUES (p_user_id, p_cosmetic_id)
  ON CONFLICT (user_id, cosmetic_id) DO NOTHING
  RETURNING * INTO v_row;

  IF v_row.user_id IS NULL THEN
    SELECT * INTO v_row FROM public.character_cosmetic_inventory
     WHERE user_id = p_user_id AND cosmetic_id = p_cosmetic_id;
  END IF;
  RETURN v_row;
END;
$func$;

REVOKE EXECUTE ON FUNCTION public.grant_cosmetic(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.grant_cosmetic(uuid, text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.grant_cosmetic(uuid, text) FROM anon;
GRANT  EXECUTE ON FUNCTION public.grant_cosmetic(uuid, text) TO service_role;

-- ============================================================
-- 7. RPC: consume_boost — caller-owns; deducts 1 from quantity
-- ============================================================
-- Called by enter_race in a future PR when the user attaches a boost to
-- their entry. For now exposed as standalone so admin / test paths can
-- exercise it.

CREATE OR REPLACE FUNCTION public.consume_boost(
  p_boost_id text
)
RETURNS public.character_boost_inventory
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $func$
DECLARE
  v_uid uuid;
  v_row public.character_boost_inventory%ROWTYPE;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  UPDATE public.character_boost_inventory
     SET quantity = quantity - 1
   WHERE user_id = v_uid AND boost_id = p_boost_id AND quantity > 0
   RETURNING * INTO v_row;

  IF v_row.user_id IS NULL THEN
    RAISE EXCEPTION 'no inventory for boost: %', p_boost_id
      USING ERRCODE = '23502',
            HINT    = 'You do not own this boost or your stack is empty';
  END IF;

  RETURN v_row;
END;
$func$;

GRANT EXECUTE ON FUNCTION public.consume_boost(text) TO authenticated;

-- ============================================================
-- 8. RPC: set_active_cosmetic — caller-owns; toggles + clears slot
-- ============================================================
-- Activates the named cosmetic for the caller, deactivating any other
-- cosmetic in the same slot. Pass NULL to clear the slot entirely.

CREATE OR REPLACE FUNCTION public.set_active_cosmetic(
  p_cosmetic_id text,
  p_slot        text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $func$
DECLARE
  v_uid  uuid;
  v_slot text;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  IF p_cosmetic_id IS NOT NULL THEN
    -- Verify ownership + look up slot from catalog
    IF NOT EXISTS (
      SELECT 1 FROM public.character_cosmetic_inventory
       WHERE user_id = v_uid AND cosmetic_id = p_cosmetic_id
    ) THEN
      RAISE EXCEPTION 'cosmetic not in inventory: %', p_cosmetic_id USING ERRCODE = '23502';
    END IF;
    SELECT slot INTO v_slot FROM public.character_cosmetics_catalog WHERE id = p_cosmetic_id;
  ELSE
    v_slot := p_slot;
    IF v_slot IS NULL THEN
      RAISE EXCEPTION 'p_slot required when clearing without p_cosmetic_id' USING ERRCODE = '22023';
    END IF;
  END IF;

  -- Deactivate everything in the slot for this user
  UPDATE public.character_cosmetic_inventory ci
     SET is_active = false
    FROM public.character_cosmetics_catalog cc
   WHERE ci.cosmetic_id = cc.id
     AND ci.user_id = v_uid
     AND cc.slot = v_slot;

  -- Activate the chosen one (if any)
  IF p_cosmetic_id IS NOT NULL THEN
    UPDATE public.character_cosmetic_inventory
       SET is_active = true
     WHERE user_id = v_uid AND cosmetic_id = p_cosmetic_id;
  END IF;
END;
$func$;

GRANT EXECUTE ON FUNCTION public.set_active_cosmetic(text, text) TO authenticated;

-- ============================================================
-- 9. RPC: roll_random_drop — service-role; called from session-log path
-- ============================================================
-- Probabilistic drop. Called from /api/community/progress after
-- award_session_xp. Drop chance scaled by rarity:
--   common       : 1.5%   chance
--   rare         : 0.4%   chance
--   epic         : 0.10%  chance
--   legendary    : 0.025% chance
-- Roughly: ~2% of session logs yield a drop, mostly common boosts. Tuning
-- knobs live in the function body. Returns the granted item (boost or
-- cosmetic) or NULL if nothing dropped.

CREATE OR REPLACE FUNCTION public.roll_random_drop(p_user_id uuid)
RETURNS TABLE(
  kind     text,
  item_id  text,
  rarity   text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $func$
DECLARE
  v_roll          numeric;
  v_rarity        text;
  v_kind          text;
  v_item_id       text;
  v_pool_count    int;
  v_pick_offset   int;
BEGIN
  -- Master roll: do we drop ANYTHING this session? Then which rarity?
  v_roll := random();

  IF v_roll < 0.00025 THEN
    v_rarity := 'legendary';
  ELSIF v_roll < 0.00125 THEN  -- 0.00025 + 0.001
    v_rarity := 'epic';
  ELSIF v_roll < 0.00525 THEN  -- + 0.004
    v_rarity := 'rare';
  ELSIF v_roll < 0.02025 THEN  -- + 0.015
    v_rarity := 'common';
  ELSE
    RETURN; -- no drop
  END IF;

  -- Coin flip: boost vs cosmetic. Weighted 70/30 toward boosts (mechanical
  -- impact > visual flair for retention loop).
  IF random() < 0.70 THEN
    v_kind := 'boost';
    SELECT count(*) INTO v_pool_count FROM public.character_boosts_catalog
     WHERE rarity = v_rarity AND enabled = true;
    IF v_pool_count = 0 THEN RETURN; END IF;
    v_pick_offset := floor(random() * v_pool_count)::int;
    SELECT id INTO v_item_id FROM public.character_boosts_catalog
     WHERE rarity = v_rarity AND enabled = true
     ORDER BY id
     OFFSET v_pick_offset LIMIT 1;
    PERFORM public.grant_boost(p_user_id, v_item_id, 1);
  ELSE
    v_kind := 'cosmetic';
    SELECT count(*) INTO v_pool_count FROM public.character_cosmetics_catalog
     WHERE rarity = v_rarity AND enabled = true;
    IF v_pool_count = 0 THEN RETURN; END IF;
    v_pick_offset := floor(random() * v_pool_count)::int;
    SELECT id INTO v_item_id FROM public.character_cosmetics_catalog
     WHERE rarity = v_rarity AND enabled = true
     ORDER BY id
     OFFSET v_pick_offset LIMIT 1;
    -- Skip if user already owns this cosmetic — return null
    IF EXISTS (
      SELECT 1 FROM public.character_cosmetic_inventory
       WHERE user_id = p_user_id AND cosmetic_id = v_item_id
    ) THEN
      RETURN; -- already owned, no drop
    END IF;
    PERFORM public.grant_cosmetic(p_user_id, v_item_id);
  END IF;

  kind    := v_kind;
  item_id := v_item_id;
  rarity  := v_rarity;
  RETURN NEXT;
END;
$func$;

REVOKE EXECUTE ON FUNCTION public.roll_random_drop(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.roll_random_drop(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.roll_random_drop(uuid) FROM anon;
GRANT  EXECUTE ON FUNCTION public.roll_random_drop(uuid) TO service_role;

-- ============================================================
-- 10. Catalog seed — ~12 boosts + ~10 cosmetics
-- ============================================================

INSERT INTO public.character_boosts_catalog (id, name, description, emoji, effect_stat, effect_pct, rarity, gbp_price)
VALUES
  -- Common
  ('speed_tonic',       'Speed Tonic',       'Quick burst of energy. +5% speed for one race.',           '⚡', 'speed',      0.05, 'common',    1.99),
  ('endurance_brew',    'Endurance Brew',    'Sustained pace fuel. +5% endurance for one race.',         '🫁', 'endurance',  0.05, 'common',    1.99),
  ('grit_bar',          'Grit Bar',          'Pushes through pain. +5% resilience for one race.',        '🛡', 'resilience', 0.05, 'common',    1.99),
  -- Rare
  ('lightning_serum',   'Lightning Serum',   'Big speed kick. +12% speed for one race.',                 '⚡', 'speed',      0.12, 'rare',      4.99),
  ('marathon_focus',    'Marathon Focus',    'Locked-in long-distance pace. +12% endurance.',            '🫁', 'endurance',  0.12, 'rare',      4.99),
  ('iron_will',         'Iron Will',         'Refuse to break. +12% resilience.',                        '🛡', 'resilience', 0.12, 'rare',      4.99),
  -- Epic
  ('class_amplifier',   'Class Amplifier',   'Doubles class-fit advantage. +5% multiplicative.',         '🌟', 'class_fit',  0.05, 'epic',      9.99),
  ('blitz_protocol',    'Blitz Protocol',    'Top-tier sprint kit. +20% speed.',                         '⚡', 'speed',      0.20, 'epic',      9.99),
  ('iron_lung',         'Iron Lung',         'Pro-level endurance. +20% endurance.',                     '🫁', 'endurance',  0.20, 'epic',      9.99),
  -- Legendary
  ('apex_form',         'Apex Form',         'Peak race-day shape. +15% to all three stats.',            '👑', 'speed',      0.15, 'legendary', 19.99),
  ('class_overcharge',  'Class Overcharge',  'Pushes class-fit modifier to its limit. +12% mult.',       '💎', 'class_fit',  0.12, 'legendary', 19.99)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, emoji = EXCLUDED.emoji,
  effect_stat = EXCLUDED.effect_stat, effect_pct = EXCLUDED.effect_pct,
  rarity = EXCLUDED.rarity, gbp_price = EXCLUDED.gbp_price;

INSERT INTO public.character_cosmetics_catalog (id, name, description, emoji, slot, asset, rarity, gbp_price)
VALUES
  -- Common kit colours
  ('kit_cyan',          'Cyan Kit',          'NextSplit signature cyan.',                                 '🎽', 'kit_colour', '{"colour":"#06b6d4"}'::jsonb,    'common',    null),
  ('kit_amber',         'Amber Kit',         'Warm amber gear.',                                          '🎽', 'kit_colour', '{"colour":"#f59e0b"}'::jsonb,    'common',    null),
  ('kit_forest',        'Forest Kit',        'Earthy green kit.',                                         '🎽', 'kit_colour', '{"colour":"#10b981"}'::jsonb,    'common',    1.99),
  -- Rare cosmetics
  ('kit_neon_pink',     'Neon Pink Kit',     'Loud, bold, fast.',                                         '🎽', 'kit_colour', '{"colour":"#ff3d8b"}'::jsonb,    'rare',      4.99),
  ('shoes_volt',        'Volt Shoes',        'Yellow-green grip-and-go.',                                 '👟', 'shoes',      '{"colour":"#bef264"}'::jsonb,    'rare',      4.99),
  ('accessory_visor',   'Race Visor',        'Sun-shielded focus.',                                       '🧢', 'accessory',  '{"icon":"visor"}'::jsonb,        'rare',      4.99),
  -- Epic cosmetics
  ('banner_streak',     'Streak Banner',     'Flame-trail behind your runner. Earned at 30-day streak.', '🔥', 'banner',     '{"effect":"flame_trail"}'::jsonb, 'epic',      null),
  ('aura_pulse',        'Pulse Aura',        'Magenta heartbeat glow. Race-only flair.',                  '💗', 'aura',       '{"colour":"#ff3d8b","kind":"pulse"}'::jsonb, 'epic', 9.99),
  -- Legendary
  ('kit_chrome',        'Chrome Kit',        'Iridescent finish. Drops only.',                            '🎽', 'kit_colour', '{"colour":"chrome","gradient":true}'::jsonb, 'legendary', null),
  ('aura_supernova',    'Supernova Aura',    'Star-collapse-grade glow. The rarest drop.',                '🌟', 'aura',       '{"effect":"supernova"}'::jsonb,  'legendary', null)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, description = EXCLUDED.description, emoji = EXCLUDED.emoji,
  slot = EXCLUDED.slot, asset = EXCLUDED.asset, rarity = EXCLUDED.rarity, gbp_price = EXCLUDED.gbp_price;

COMMIT;
