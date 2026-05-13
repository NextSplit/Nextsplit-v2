// Auto-generated types matching the Supabase schema
// Update this after running: npx supabase gen types typescript

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string | null
          age: number | null
          weight_kg: number | null
          experience: 'beginner' | 'intermediate' | 'advanced' | null
          injury_notes: string | null
          target_weight: number | null
          units: 'km' | 'miles'
          dark_mode: boolean
          text_size: 'default' | 'large' | 'xl'
          notifications_enabled: boolean
          notification_time: string | null
          is_coach: boolean
          coach_verified: boolean
          coach_applied_at: string | null
          coach_tier: 'split_leader' | 'professional' | null
          // PR F1: typed NutritionSettings { weight_kg, height_cm, age, sex,
          // activity_level, goal }. Null pre-setup. Mirrored to localStorage
          // by useNutritionSettings.
          nutrition_settings: Json | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }
      plan_templates: {
        Row: {
          id: string
          slug: string
          name: string
          subtitle: string | null
          distance: string
          level: string
          weeks_min: number
          weeks_max: number
          runs_per_week: number
          peak_km_week: number | null
          longest_run_km: number | null
          description: string | null
          meta: Json
          weeks_data: Json
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['plan_templates']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['plan_templates']['Insert']>
      }
      user_plans: {
        Row: {
          id: string
          user_id: string
          template_id: string | null
          plan_type: 'predetermined' | 'ai_bespoke' | 'manual' | 'lifestyle'
          status: 'active' | 'completed' | 'paused' | 'archived'
          name: string
          goal: string | null
          race_date: string | null
          start_date: string
          total_weeks: number
          current_week: number
          weeks_data: Json
          meta: Json
          created_at: string
          updated_at: string
          deleted_at: string | null
          archived_at: string | null
          completed_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['user_plans']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['user_plans']['Insert']>
      }
      training_logs: {
        Row: {
          id: string
          user_id: string
          plan_id: string
          week_n: number
          day_i: number
          session_i: number
          done: boolean
          effort: number | null
          km: number | null
          pace: string | null
          hr: number | null
          duration_secs: number | null
          notes: string | null
          splits: Json | null
          strava_id: number | null
          logged_at: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['training_logs']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['training_logs']['Insert']>
      }
      wellness_logs: {
        Row: {
          id: string
          user_id: string
          log_date: string
          log_type: 'daily' | 'weekly'
          sleep: number | null
          energy: number | null
          mood: number | null
          soreness: number | null
          stress: number | null
          weight_kg: number | null
          notes: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['wellness_logs']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['wellness_logs']['Insert']>
      }
      gym_logs: {
        Row: {
          id: string
          user_id: string
          plan_id: string
          week_n: number
          day_i: number
          session_i: number
          exercises: Json
          logged_at: string
        }
        Insert: Omit<Database['public']['Tables']['gym_logs']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['gym_logs']['Insert']>
      }
      races: {
        Row: {
          id: string
          user_id: string
          plan_id: string | null
          name: string
          race_date: string
          distance_km: number | null
          distance_label: string | null
          priority: 'A' | 'B' | 'C' | 'training'
          goal_time_secs: number | null
          actual_time_secs: number | null
          location: string | null
          notes: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['races']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['races']['Insert']>
      }
      activity_logs: {
        Row: {
          id: string
          user_id: string
          activity_type: 'swim' | 'cycle' | 'walk' | 'hike' | 'yoga' | 'other'
          logged_at: string
          duration_secs: number | null
          distance_km: number | null
          calories: number | null
          effort: number | null
          notes: string | null
          strava_id: number | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['activity_logs']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['activity_logs']['Insert']>
      }
      strava_connections: {
        Row: {
          id: string
          user_id: string
          athlete_id: number
          access_token: string
          refresh_token: string
          token_expires_at: string
          connected_at: string
        }
        Insert: Omit<Database['public']['Tables']['strava_connections']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['strava_connections']['Insert']>
      }
      recipes: {
        Row: {
          id: string
          user_id: string
          name: string
          servings: number
          kcal_total: number | null
          protein_total: number | null
          carbs_total: number | null
          fat_total: number | null
          ingredients: RecipeIngredient[]
          notes: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['recipes']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['recipes']['Insert']>
      }
      meal_plan_entries: {
        Row: {
          id: string
          user_id: string
          plan_date: string
          meal_slot: string
          // PR E5: recipe_id is now nullable (freeform entries supported);
          // either recipe_id or name must be set per the DB CHECK constraint
          // meal_plan_entries_recipe_or_name_present.
          recipe_id: string | null
          portions: number
          name: string | null
          kcal_total: number | null
          protein_total: number | null
          carbs_total: number | null
          fat_total: number | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['meal_plan_entries']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['meal_plan_entries']['Insert']>
      }
      // PR G3: in-app notification inbox. Inserts from smart-notify cron
      // via service-role; users read + mark-as-read their own rows.
      notifications: {
        Row: {
          id:         string
          user_id:    string
          type:       string
          title:      string | null
          body:       string | null
          data:       Json | null
          read:       boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['notifications']['Row'], 'id' | 'created_at' | 'read'> & {
          read?: boolean
        }
        Update: Partial<Database['public']['Tables']['notifications']['Insert']>
      }
    }
  }
}

// ── Domain types ──────────────────────────────────────────────────────────────

export type Profile = Database['public']['Tables']['profiles']['Row']
export type PlanTemplate = Database['public']['Tables']['plan_templates']['Row']
export type UserPlan = Database['public']['Tables']['user_plans']['Row']
export type TrainingLog = Database['public']['Tables']['training_logs']['Row']
export type WellnessLog = Database['public']['Tables']['wellness_logs']['Row']
export type GymLog = Database['public']['Tables']['gym_logs']['Row']
export type Race = Database['public']['Tables']['races']['Row']
export type ActivityLog = Database['public']['Tables']['activity_logs']['Row']
export type Recipe = Database['public']['Tables']['recipes']['Row']
export type MealPlanEntry = Database['public']['Tables']['meal_plan_entries']['Row']

export interface MealPlanEntryWithRecipe extends MealPlanEntry {
  recipe: Recipe
}

export interface RecipeIngredient {
  name: string
  quantity: number
  unit: string   // 'g' | 'ml' | 'cup' | 'tbsp' | 'tsp' | 'piece' | 'slice'
}

export const MEAL_SLOTS = [
  { id: 'breakfast', label: 'Breakfast', emoji: '🌅' },
  { id: 'pre_run',   label: 'Pre-run',   emoji: '⚡' },
  { id: 'lunch',     label: 'Lunch',     emoji: '☀️' },
  { id: 'snack',     label: 'Snack',     emoji: '🍌' },
  { id: 'post_run',  label: 'Post-run',  emoji: '💪' },
  { id: 'dinner',    label: 'Dinner',    emoji: '🌙' },
] as const

export type MealSlotId = typeof MEAL_SLOTS[number]['id']

// ── Plan data types (for weeks_data JSONB) ────────────────────────────────────

export interface PlanSession {
  c: string          // session type code
  n: string          // name
  det: string        // coaching detail
  km: number         // planned km
}

export interface NutritionEvent {
  t: string          // timing
  l: string          // label
  d: string          // detail
  cat: string        // category
}

export interface PlanDay {
  d: string          // Mon/Tue/etc
  dt: string         // date string
  sleep: string | null
  times: { t: string; l: string }[]
  sessions: PlanSession[]
  nut: NutritionEvent[]
}

export interface PlanWeek {
  n: number
  ph: string         // p1/p2/tr
  s: string          // start date
  e: string          // end date
  title: string
  b: string          // d/k/p/r
  kl: [number, number]
  note: string
  days: PlanDay[]
}

// ── Extended types added post-initial-schema ──────────────────────────────────

/** Safer PlanSession with nullable c for legacy/malformed data */
export interface SafePlanSession extends Omit<PlanSession, 'c'> {
  c: string | null | undefined
}

/** Phase 11: Stripe fields (columns to be added to profiles table) */
export interface ProfileWithStripe extends Profile {
  is_pro: boolean
  pro_expires_at: string | null
  stripe_customer_id: string | null
}

/** Runner class migration fields — added April 2026 */
export type RunnerClassId =
  | 'warming_up'
  | 'marathon_runner'
  | 'speed_merchant'
  | 'trail_blazer'
  | 'base_builder'
  | 'all_rounder'
  | 'comeback_runner'

export interface ProfileWithRunnerClass extends Profile {
  runner_class: RunnerClassId | null
  runner_class_updated_at: string | null
  runner_class_revealed: boolean
  first_session_logged_at: string | null
}

/** Voice messages — added April 2026 */
export interface VoiceMessageRecord {
  id: string
  coach_id: string
  athlete_id: string
  storage_path: string
  duration_secs: number | null
  session_annotation_id: string | null
  listened_at: string | null
  created_at: string
}

// ── Coach Platform Types (Phase 2-3) ─────────────────────────────────────────

export interface CoachProfile {
  user_id: string
  display_name: string
  slug: string
  bio: string | null
  credentials: string | null
  specialities: string[]
  photo_url: string | null
  video_intro_url: string | null
  video_intro_seconds: number | null
  location: string | null
  timezone: string | null
  website_url: string | null
  instagram_handle: string | null
  strava_profile: string | null
  rate_monthly_gbp: number | null
  rate_plan_gbp: number | null
  verified: boolean
  verification_tier: "listed" | "credential_verified" | "elite"
  credential_status: "pending" | "approved" | "rejected"
  uka_number: string | null
  accepting_athletes: boolean
  max_athletes: number
  specialty_tags: string[]
  distance_tags: string[]
  athlete_type_tags: string[]
  language_tags: string[]
  coach_pbs: Record<string, string>
  avg_rating: number
  review_count: number
  completion_rate: number
  total_athletes: number
  is_featured: boolean
  featured_until: string | null
  group_coaching: boolean
  group_max_size: number | null
  group_price_gbp: number | null
  stripe_account_id: string | null
  created_at: string
  updated_at: string
}

export interface CoachReview {
  id: string
  coach_id: string
  athlete_id: string
  coach_athlete_id: string | null
  rating: number
  review_text: string | null
  would_recommend: boolean
  is_anonymous: boolean
  published_at: string
  created_at: string
  profiles?: { display_name: string | null; handle: string | null }
}

export interface CoachAthlete {
  id: string
  coach_id: string
  athlete_id: string
  status: 'pending' | 'active' | 'paused' | 'ended'
  invite_token: string | null
  invited_at: string | null
  accepted_at: string | null
  share_logs: boolean
  share_wellness: boolean
  share_nutrition: boolean
  subscription_id: string | null
  coach_notes: string | null
  athlete_goal: string | null
  created_at: string
}

export interface SessionAnnotation {
  id: string
  coach_id: string
  athlete_id: string
  plan_id: string
  week_n: number
  day_i: number
  session_i: number
  note: string
  reaction: 'great' | 'good' | 'concern' | 'flag' | null
  acknowledged_at: string | null
  created_at: string
}

export interface CoachMessage {
  id: string
  coach_id: string
  athlete_id: string
  sender_id: string
  body: string
  read_at: string | null
  created_at: string
}

export interface PlanPurchase {
  id: string
  athlete_id: string
  template_id: string
  coach_id: string | null
  amount_gbp: number
  stripe_payment_id: string | null
  coach_payout_gbp: number | null
  platform_fee_gbp: number | null
  purchased_at: string
}

/** Athlete's summary as seen from the coach squad view */
export interface AthleteSummary {
  athlete_id: string
  display_name: string | null
  plan_name: string | null
  plan_week: number | null
  total_weeks: number | null
  sessions_done_this_week: number
  sessions_planned_this_week: number
  acwr: number | null
  avg_sleep_last7: number | null
  avg_soreness_last7: number | null
  last_active_at: string | null
  status: 'on_track' | 'attention' | 'flag'
  relationship: CoachAthlete
}

export interface CoachReview {
  id: string
  coach_id: string
  athlete_id: string
  plan_id: string | null
  rating: number
  review_text: string | null
  coach_reply: string | null
  is_visible: boolean
  created_at: string
}

export interface CoachAutomationRule {
  id: string
  coach_id: string
  trigger: 'session_missed' | 'pb_achieved' | 'acwr_high' | 'acwr_low' |
           'streak_achieved' | 'plan_completed' | 'inactive_3days' | 'wellness_low'
  template: string
  is_active: boolean
  require_approval: boolean
  created_at: string
}

/** Extended coach message with voice support */
export interface CoachMessageV2 extends CoachMessage {
  message_type: 'text' | 'voice'
  audio_url: string | null
  auto_sent: boolean          // true if sent by AI automation
  rule_id: string | null      // which automation rule triggered it
}

export interface SplitLeaderProfile {
  user_id: string
  display_name: string
  bio: string | null
  photo_url: string | null
  max_athletes: number
  created_at: string
}

export interface SplitLeaderAthlete {
  id: string
  leader_id: string
  athlete_id: string
  status: 'active' | 'ended'
  created_at: string
}

/** What a Split Leader sees for each of their runners (simplified AthleteSummary) */
export interface SquadRunnerSummary {
  athlete_id: string
  display_name: string | null
  plan_name: string | null
  sessions_done_this_week: number
  sessions_planned_this_week: number
  last_active_at: string | null
  streak: number
}

/** Full three-tier account type */
export type AccountTier = 'athlete' | 'split_leader' | 'professional_coach'

export interface FeaturedPlan {
  id: string
  template_id: string
  week_start: string
  feature_type: 'algorithmic' | 'editorial' | 'debut'
  position: number
  impressions: number
  clicks: number
  conversions: number
  created_at: string
}

/** Plan template with computed marketplace stats */
export interface PlanTemplateWithStats extends PlanTemplate {
  avg_completion_rate: number | null
  total_starts: number
  total_completions: number
  avg_rating: number | null
  review_count: number
  author_type: 'nextsplit' | 'coach'
  author_id: string | null
  price_gbp: number | null
  is_public: boolean
  preview_weeks: number
  // Joined
  coach_profile?: CoachProfile
  is_featured_this_week?: boolean
}


// ── Onboarding & Character Types (Sprint 1) ───────────────────────────────────

export interface CharacterConfig {
  // Appearance
  bodyType:      'slim' | 'athletic' | 'stocky'
  skinTone:      string   // hex or token e.g. 'tone-1' through 'tone-6'
  hairStyle:     'short' | 'medium' | 'long' | 'ponytail' | 'bun' | 'none'
  hairColour:    string   // hex or token
  faceShape:     'oval' | 'round' | 'square' | 'heart'
  // Kit
  kitColour:     string   // primary kit hex
  shoeColour:    string   // shoe hex
  // Accessories (optional)
  accessories:   Array<'cap' | 'sunglasses' | 'watch' | 'crown' | 'none'>
  // Identity
  startingTitle: string   // e.g. "The Newcomer", "The Determined"
}

export interface RecentRaceTimes {
  '5k'?:       number   // seconds
  '10k'?:      number
  'half'?:     number
  'marathon'?: number
}

export interface ProfileOnboarding extends Profile {
  // Character
  handle:                string | null
  character_config:      CharacterConfig | null
  // Sport
  sport_focus:           string[]
  // About You
  biological_sex:        'male' | 'female' | 'prefer_not_to_say' | null
  health_flags:          string[]
  // Running
  running_experience:    'lt_6mo' | '6_12mo' | '1_3yr' | '3yr_plus' | null
  weekly_km_current:     number
  recent_race_times:     RecentRaceTimes | null
  longest_recent_run:    number | null
  run_surfaces:          string[]
  // Life
  training_days:         number
  preferred_long_run_day: string | null
  preferred_run_time:    'morning' | 'lunchtime' | 'evening' | 'varies' | null
  // Gym
  gym_enabled:           boolean
  gym_sessions_per_week: number
  gym_equipment:         string[]
  gym_focus:             'general' | 'runner_specific' | 'hypertrophy' | 'rehab' | null
  // State
  onboarding_complete:   boolean
  onboarding_step:       number
}

export interface UserGoal {
  id:                   string
  user_id:              string
  goal_type:            'race' | 'time_target' | 'distance_milestone' | 'general_fitness' | 'continuous'
  priority:             'A' | 'B' | 'C'
  status:               'active' | 'completed' | 'abandoned'
  race_name:            string | null
  race_date:            string | null
  race_distance_km:     number | null
  race_distance_label:  string | null
  target_time_secs:     number | null
  actual_time_secs:     number | null
  notes:                string | null
  created_at:           string
  updated_at:           string
}

export interface SportInterestWaitlist {
  id:         string
  user_id:    string
  sport:      string
  created_at: string
}

// Starting titles shown at character creation
export const STARTING_TITLES = [
  'The Newcomer',
  'The Determined',
  'The Early Riser',
  'The Weekend Warrior',
  'The Comeback Kid',
  'The Quiet Achiever',
  'The Pacemaker',
  'The Chaser',
] as const

export type StartingTitle = typeof STARTING_TITLES[number]

// Sports for the sport select screen
export const SPORTS = [
  { id: 'running',   label: 'Running',          emoji: '🏃', active: true },
  { id: 'gym',       label: 'Gym / Strength',   emoji: '🏋️', active: true },
  { id: 'cycling',   label: 'Cycling',          emoji: '🚴', active: false },
  { id: 'swimming',  label: 'Swimming',         emoji: '🏊', active: false },
  { id: 'triathlon', label: 'Triathlon',        emoji: '🏅', active: false },
  { id: 'hiking',    label: 'Hiking / Trails',  emoji: '🥾', active: false },
] as const

export type SportId = typeof SPORTS[number]['id']
