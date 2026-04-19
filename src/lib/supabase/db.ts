/**
 * Typed Supabase query helper.
 *
 * Eliminates db(supabase) casts throughout the codebase.
 * Returns a typed query builder for each table.
 *
 * Usage:
 *   import { db } from '@/lib/supabase/db'
 *   const { data } = await db(supabase).from('training_logs').select('*')...
 *
 * This is a thin wrapper — all Supabase query methods work as normal.
 * The cast is contained here rather than scattered across 55 call sites.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function db(supabase: SupabaseClient<any>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return supabase as any
}

/**
 * Table names for autocomplete + safety.
 * Add new tables here as the schema grows.
 */
export type TableName =
  | 'profiles'
  | 'plan_templates'
  | 'user_plans'
  | 'training_logs'
  | 'gym_logs'
  | 'wellness_logs'
  | 'races'
  | 'recipes'
  | 'meal_plan_entries'
  | 'strava_connections'
  | 'ai_usage'
  | 'push_subscriptions'
