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
          recipe_id: string
          portions: number
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['meal_plan_entries']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['meal_plan_entries']['Insert']>
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
