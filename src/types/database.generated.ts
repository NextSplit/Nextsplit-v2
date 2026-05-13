export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          activity_type: string
          calories: number | null
          created_at: string
          distance_km: number | null
          duration_secs: number | null
          effort: number | null
          id: string
          logged_at: string
          notes: string | null
          strava_id: number | null
          user_id: string
        }
        Insert: {
          activity_type: string
          calories?: number | null
          created_at?: string
          distance_km?: number | null
          duration_secs?: number | null
          effort?: number | null
          id?: string
          logged_at?: string
          notes?: string | null
          strava_id?: number | null
          user_id: string
        }
        Update: {
          activity_type?: string
          calories?: number | null
          created_at?: string
          distance_km?: number | null
          duration_secs?: number | null
          effort?: number | null
          id?: string
          logged_at?: string
          notes?: string | null
          strava_id?: number | null
          user_id?: string
        }
        Relationships: []
      }
      ai_usage: {
        Row: {
          cache_creation_tokens: number
          cache_read_tokens: number
          call_count: number
          date: string
          feature: string
          id: string
          tokens_in: number
          tokens_out: number
          user_id: string
        }
        Insert: {
          cache_creation_tokens?: number
          cache_read_tokens?: number
          call_count?: number
          date?: string
          feature?: string
          id?: string
          tokens_in?: number
          tokens_out?: number
          user_id: string
        }
        Update: {
          cache_creation_tokens?: number
          cache_read_tokens?: number
          call_count?: number
          date?: string
          feature?: string
          id?: string
          tokens_in?: number
          tokens_out?: number
          user_id?: string
        }
        Relationships: []
      }
      app_config: {
        Row: {
          key: string
          updated_at: string | null
          value: string
        }
        Insert: {
          key: string
          updated_at?: string | null
          value: string
        }
        Update: {
          key?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      bug_reports: {
        Row: {
          context: string | null
          created_at: string | null
          id: string
          message: string
          resolved: boolean | null
          url: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          context?: string | null
          created_at?: string | null
          id?: string
          message: string
          resolved?: boolean | null
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          context?: string | null
          created_at?: string | null
          id?: string
          message?: string
          resolved?: boolean | null
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      challenge_entries: {
        Row: {
          challenge_id: string
          completed: boolean | null
          completed_at: string | null
          id: string
          joined_at: string | null
          progress: number | null
          user_id: string
        }
        Insert: {
          challenge_id: string
          completed?: boolean | null
          completed_at?: string | null
          id?: string
          joined_at?: string | null
          progress?: number | null
          user_id: string
        }
        Update: {
          challenge_id?: string
          completed?: boolean | null
          completed_at?: string | null
          id?: string
          joined_at?: string | null
          progress?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_entries_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          challenge_type: string
          club_id: string | null
          created_at: string | null
          creator_id: string | null
          description: string | null
          ends_at: string
          entry_count: number | null
          id: string
          is_global: boolean | null
          reward_badge: string | null
          reward_title: string | null
          reward_xp: number | null
          starts_at: string
          target_unit: string
          target_value: number
          title: string
        }
        Insert: {
          challenge_type: string
          club_id?: string | null
          created_at?: string | null
          creator_id?: string | null
          description?: string | null
          ends_at: string
          entry_count?: number | null
          id?: string
          is_global?: boolean | null
          reward_badge?: string | null
          reward_title?: string | null
          reward_xp?: number | null
          starts_at: string
          target_unit: string
          target_value: number
          title: string
        }
        Update: {
          challenge_type?: string
          club_id?: string | null
          created_at?: string | null
          creator_id?: string | null
          description?: string | null
          ends_at?: string
          entry_count?: number | null
          id?: string
          is_global?: boolean | null
          reward_badge?: string | null
          reward_title?: string | null
          reward_xp?: number | null
          starts_at?: string
          target_unit?: string
          target_value?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenges_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      character_boost_inventory: {
        Row: {
          acquired_at: string
          boost_id: string
          quantity: number
          user_id: string
        }
        Insert: {
          acquired_at?: string
          boost_id: string
          quantity?: number
          user_id: string
        }
        Update: {
          acquired_at?: string
          boost_id?: string
          quantity?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "character_boost_inventory_boost_id_fkey"
            columns: ["boost_id"]
            isOneToOne: false
            referencedRelation: "character_boosts_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "character_boost_inventory_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      character_boosts_catalog: {
        Row: {
          created_at: string
          description: string
          effect_pct: number
          effect_stat: string
          emoji: string
          enabled: boolean
          gbp_price: number | null
          id: string
          name: string
          rarity: string
        }
        Insert: {
          created_at?: string
          description: string
          effect_pct: number
          effect_stat: string
          emoji?: string
          enabled?: boolean
          gbp_price?: number | null
          id: string
          name: string
          rarity: string
        }
        Update: {
          created_at?: string
          description?: string
          effect_pct?: number
          effect_stat?: string
          emoji?: string
          enabled?: boolean
          gbp_price?: number | null
          id?: string
          name?: string
          rarity?: string
        }
        Relationships: []
      }
      character_cosmetic_inventory: {
        Row: {
          acquired_at: string
          cosmetic_id: string
          is_active: boolean
          user_id: string
        }
        Insert: {
          acquired_at?: string
          cosmetic_id: string
          is_active?: boolean
          user_id: string
        }
        Update: {
          acquired_at?: string
          cosmetic_id?: string
          is_active?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "character_cosmetic_inventory_cosmetic_id_fkey"
            columns: ["cosmetic_id"]
            isOneToOne: false
            referencedRelation: "character_cosmetics_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "character_cosmetic_inventory_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      character_cosmetics_catalog: {
        Row: {
          asset: Json
          created_at: string
          description: string
          emoji: string
          enabled: boolean
          gbp_price: number | null
          id: string
          name: string
          rarity: string
          slot: string
        }
        Insert: {
          asset: Json
          created_at?: string
          description: string
          emoji?: string
          enabled?: boolean
          gbp_price?: number | null
          id: string
          name: string
          rarity: string
          slot: string
        }
        Update: {
          asset?: Json
          created_at?: string
          description?: string
          emoji?: string
          enabled?: boolean
          gbp_price?: number | null
          id?: string
          name?: string
          rarity?: string
          slot?: string
        }
        Relationships: []
      }
      character_race_entries: {
        Row: {
          boost_loadout: Json
          character_snapshot: Json
          entered_at: string
          id: string
          race_id: string
          user_id: string
        }
        Insert: {
          boost_loadout?: Json
          character_snapshot: Json
          entered_at?: string
          id?: string
          race_id: string
          user_id: string
        }
        Update: {
          boost_loadout?: Json
          character_snapshot?: Json
          entered_at?: string
          id?: string
          race_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "character_race_entries_race_id_fkey"
            columns: ["race_id"]
            isOneToOne: false
            referencedRelation: "character_races"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "character_race_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      character_race_results: {
        Row: {
          computed_at: string
          finishing_order: Json
          race_id: string
          result_timeline: Json
        }
        Insert: {
          computed_at?: string
          finishing_order: Json
          race_id: string
          result_timeline: Json
        }
        Update: {
          computed_at?: string
          finishing_order?: Json
          race_id?: string
          result_timeline?: Json
        }
        Relationships: [
          {
            foreignKeyName: "character_race_results_race_id_fkey"
            columns: ["race_id"]
            isOneToOne: true
            referencedRelation: "character_races"
            referencedColumns: ["id"]
          },
        ]
      }
      character_races: {
        Row: {
          created_at: string
          distance_m: number
          entries_close_at: string
          entries_open_at: string
          finalized_at: string | null
          format: string
          id: string
          name: string
          resolves_at: string
          rng_seed: number
        }
        Insert: {
          created_at?: string
          distance_m: number
          entries_close_at: string
          entries_open_at?: string
          finalized_at?: string | null
          format: string
          id?: string
          name: string
          resolves_at: string
          rng_seed?: number
        }
        Update: {
          created_at?: string
          distance_m?: number
          entries_close_at?: string
          entries_open_at?: string
          finalized_at?: string | null
          format?: string
          id?: string
          name?: string
          resolves_at?: string
          rng_seed?: number
        }
        Relationships: []
      }
      character_reward_claims: {
        Row: {
          claimed_at: string
          granted_item_id: string | null
          granted_item_kind: string | null
          reward_key: string
          reward_kind: string
          user_id: string
        }
        Insert: {
          claimed_at?: string
          granted_item_id?: string | null
          granted_item_kind?: string | null
          reward_key: string
          reward_kind: string
          user_id: string
        }
        Update: {
          claimed_at?: string
          granted_item_id?: string | null
          granted_item_kind?: string | null
          reward_key?: string
          reward_kind?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "character_reward_claims_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      characters: {
        Row: {
          active_cosmetics: Json
          build_class: string
          created_at: string
          endurance_stat: number
          level: number
          resilience_stat: number
          speed_stat: number
          updated_at: string
          user_id: string
          xp: number
        }
        Insert: {
          active_cosmetics?: Json
          build_class: string
          created_at?: string
          endurance_stat?: number
          level?: number
          resilience_stat?: number
          speed_stat?: number
          updated_at?: string
          user_id: string
          xp?: number
        }
        Update: {
          active_cosmetics?: Json
          build_class?: string
          created_at?: string
          endurance_stat?: number
          level?: number
          resilience_stat?: number
          speed_stat?: number
          updated_at?: string
          user_id?: string
          xp?: number
        }
        Relationships: [
          {
            foreignKeyName: "characters_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      club_feed: {
        Row: {
          club_id: string
          created_at: string | null
          duration_secs: number | null
          effort: number | null
          id: string
          km: number | null
          logged_at: string
          milestone_type: string | null
          note: string | null
          pace: string | null
          reactions: Json | null
          session_name: string
          session_type: string
          user_id: string
        }
        Insert: {
          club_id: string
          created_at?: string | null
          duration_secs?: number | null
          effort?: number | null
          id?: string
          km?: number | null
          logged_at?: string
          milestone_type?: string | null
          note?: string | null
          pace?: string | null
          reactions?: Json | null
          session_name: string
          session_type: string
          user_id: string
        }
        Update: {
          club_id?: string
          created_at?: string | null
          duration_secs?: number | null
          effort?: number | null
          id?: string
          km?: number | null
          logged_at?: string
          milestone_type?: string | null
          note?: string | null
          pace?: string | null
          reactions?: Json | null
          session_name?: string
          session_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_feed_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      club_feed_reactions: {
        Row: {
          created_at: string
          feed_item_id: string
          id: string
          reaction: string
          user_id: string
        }
        Insert: {
          created_at?: string
          feed_item_id: string
          id?: string
          reaction: string
          user_id: string
        }
        Update: {
          created_at?: string
          feed_item_id?: string
          id?: string
          reaction?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_feed_reactions_feed_item_id_fkey"
            columns: ["feed_item_id"]
            isOneToOne: false
            referencedRelation: "club_feed"
            referencedColumns: ["id"]
          },
        ]
      }
      club_members: {
        Row: {
          club_id: string
          id: string
          joined_at: string
          role: string | null
          season_xp: number | null
          share_feed: boolean | null
          total_km: number | null
          user_id: string
          weekly_km: number | null
        }
        Insert: {
          club_id: string
          id?: string
          joined_at?: string
          role?: string | null
          season_xp?: number | null
          share_feed?: boolean | null
          total_km?: number | null
          user_id: string
          weekly_km?: number | null
        }
        Update: {
          club_id?: string
          id?: string
          joined_at?: string
          role?: string | null
          season_xp?: number | null
          share_feed?: boolean | null
          total_km?: number | null
          user_id?: string
          weekly_km?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "club_members_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      clubs: {
        Row: {
          coach_id: string | null
          created_at: string
          description: string | null
          emoji: string | null
          id: string
          is_public: boolean | null
          join_code: string
          member_count: number | null
          name: string
          owner_id: string
          slug: string
          total_km: number | null
          weekly_km: number | null
        }
        Insert: {
          coach_id?: string | null
          created_at?: string
          description?: string | null
          emoji?: string | null
          id?: string
          is_public?: boolean | null
          join_code: string
          member_count?: number | null
          name: string
          owner_id: string
          slug: string
          total_km?: number | null
          weekly_km?: number | null
        }
        Update: {
          coach_id?: string | null
          created_at?: string
          description?: string | null
          emoji?: string | null
          id?: string
          is_public?: boolean | null
          join_code?: string
          member_count?: number | null
          name?: string
          owner_id?: string
          slug?: string
          total_km?: number | null
          weekly_km?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "clubs_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coach_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      coach_athletes: {
        Row: {
          accepted_at: string | null
          athlete_goal: string | null
          athlete_id: string
          coach_id: string
          coach_notes: string | null
          created_at: string
          id: string
          invite_token: string | null
          invited_at: string | null
          share_logs: boolean | null
          share_nutrition: boolean | null
          share_wellness: boolean | null
          status: string | null
          subscription_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          athlete_goal?: string | null
          athlete_id: string
          coach_id: string
          coach_notes?: string | null
          created_at?: string
          id?: string
          invite_token?: string | null
          invited_at?: string | null
          share_logs?: boolean | null
          share_nutrition?: boolean | null
          share_wellness?: boolean | null
          status?: string | null
          subscription_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          athlete_goal?: string | null
          athlete_id?: string
          coach_id?: string
          coach_notes?: string | null
          created_at?: string
          id?: string
          invite_token?: string | null
          invited_at?: string | null
          share_logs?: boolean | null
          share_nutrition?: boolean | null
          share_wellness?: boolean | null
          status?: string | null
          subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coach_athletes_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coach_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      coach_digest_runs: {
        Row: {
          athlete_count: number
          coach_id: string
          delivered_at: string
          digest_payload: Json | null
          id: string
          period: string
        }
        Insert: {
          athlete_count?: number
          coach_id: string
          delivered_at?: string
          digest_payload?: Json | null
          id?: string
          period: string
        }
        Update: {
          athlete_count?: number
          coach_id?: string
          delivered_at?: string
          digest_payload?: Json | null
          id?: string
          period?: string
        }
        Relationships: []
      }
      coach_earnings: {
        Row: {
          athlete_id: string | null
          coach_id: string
          commission_gbp: number
          commission_rate: number
          created_at: string | null
          gross_gbp: number
          id: string
          net_gbp: number
          paid_out: boolean | null
          paid_out_at: string | null
          period_month: string
          source_id: string | null
          source_type: string
          stripe_transfer_id: string | null
        }
        Insert: {
          athlete_id?: string | null
          coach_id: string
          commission_gbp: number
          commission_rate: number
          created_at?: string | null
          gross_gbp: number
          id?: string
          net_gbp: number
          paid_out?: boolean | null
          paid_out_at?: string | null
          period_month: string
          source_id?: string | null
          source_type: string
          stripe_transfer_id?: string | null
        }
        Update: {
          athlete_id?: string | null
          coach_id?: string
          commission_gbp?: number
          commission_rate?: number
          created_at?: string | null
          gross_gbp?: number
          id?: string
          net_gbp?: number
          paid_out?: boolean | null
          paid_out_at?: string | null
          period_month?: string
          source_id?: string | null
          source_type?: string
          stripe_transfer_id?: string | null
        }
        Relationships: []
      }
      coach_invites: {
        Row: {
          athlete_goal: string | null
          coach_id: string
          coach_notes: string | null
          created_at: string
          expires_at: string
          id: string
          token: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          athlete_goal?: string | null
          coach_id: string
          coach_notes?: string | null
          created_at?: string
          expires_at: string
          id?: string
          token: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          athlete_goal?: string | null
          coach_id?: string
          coach_notes?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          token?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coach_invites_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coach_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      coach_messages: {
        Row: {
          athlete_id: string
          body: string
          coach_id: string
          created_at: string
          id: string
          is_scheduled: boolean | null
          message_type: string | null
          reaction: string | null
          reaction_at: string | null
          read_at: string | null
          scheduled_at: string | null
          sender_id: string
          sent_at: string | null
        }
        Insert: {
          athlete_id: string
          body: string
          coach_id: string
          created_at?: string
          id?: string
          is_scheduled?: boolean | null
          message_type?: string | null
          reaction?: string | null
          reaction_at?: string | null
          read_at?: string | null
          scheduled_at?: string | null
          sender_id: string
          sent_at?: string | null
        }
        Update: {
          athlete_id?: string
          body?: string
          coach_id?: string
          created_at?: string
          id?: string
          is_scheduled?: boolean | null
          message_type?: string | null
          reaction?: string | null
          reaction_at?: string | null
          read_at?: string | null
          scheduled_at?: string | null
          sender_id?: string
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coach_messages_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coach_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      coach_profiles: {
        Row: {
          accepting_athletes: boolean | null
          athlete_type_tags: string[] | null
          avg_rating: number | null
          bio: string | null
          coach_pbs: Json | null
          coach_pro_expires_at: string | null
          coach_pro_stripe_sub_id: string | null
          completion_rate: number | null
          created_at: string
          credential_status: string | null
          credential_url: string | null
          credentials: string | null
          digest_preference: string | null
          digest_time_utc: number | null
          display_name: string
          distance_tags: string[] | null
          featured_until: string | null
          group_coaching: boolean | null
          group_max_size: number | null
          group_price_gbp: number | null
          instagram_handle: string | null
          is_coach_pro: boolean | null
          is_featured: boolean | null
          language_tags: string[] | null
          location: string | null
          max_athletes: number | null
          photo_url: string | null
          rate_monthly_gbp: number | null
          rate_plan_gbp: number | null
          referral_code: string | null
          review_count: number | null
          slug: string
          specialities: string[] | null
          specialty_tags: string[] | null
          strava_profile: string | null
          stripe_account_id: string | null
          timezone: string | null
          total_athletes: number | null
          uka_number: string | null
          updated_at: string
          user_id: string
          verification_tier: string | null
          verified: boolean | null
          video_intro_seconds: number | null
          video_intro_url: string | null
          website_url: string | null
        }
        Insert: {
          accepting_athletes?: boolean | null
          athlete_type_tags?: string[] | null
          avg_rating?: number | null
          bio?: string | null
          coach_pbs?: Json | null
          coach_pro_expires_at?: string | null
          coach_pro_stripe_sub_id?: string | null
          completion_rate?: number | null
          created_at?: string
          credential_status?: string | null
          credential_url?: string | null
          credentials?: string | null
          digest_preference?: string | null
          digest_time_utc?: number | null
          display_name: string
          distance_tags?: string[] | null
          featured_until?: string | null
          group_coaching?: boolean | null
          group_max_size?: number | null
          group_price_gbp?: number | null
          instagram_handle?: string | null
          is_coach_pro?: boolean | null
          is_featured?: boolean | null
          language_tags?: string[] | null
          location?: string | null
          max_athletes?: number | null
          photo_url?: string | null
          rate_monthly_gbp?: number | null
          rate_plan_gbp?: number | null
          referral_code?: string | null
          review_count?: number | null
          slug: string
          specialities?: string[] | null
          specialty_tags?: string[] | null
          strava_profile?: string | null
          stripe_account_id?: string | null
          timezone?: string | null
          total_athletes?: number | null
          uka_number?: string | null
          updated_at?: string
          user_id: string
          verification_tier?: string | null
          verified?: boolean | null
          video_intro_seconds?: number | null
          video_intro_url?: string | null
          website_url?: string | null
        }
        Update: {
          accepting_athletes?: boolean | null
          athlete_type_tags?: string[] | null
          avg_rating?: number | null
          bio?: string | null
          coach_pbs?: Json | null
          coach_pro_expires_at?: string | null
          coach_pro_stripe_sub_id?: string | null
          completion_rate?: number | null
          created_at?: string
          credential_status?: string | null
          credential_url?: string | null
          credentials?: string | null
          digest_preference?: string | null
          digest_time_utc?: number | null
          display_name?: string
          distance_tags?: string[] | null
          featured_until?: string | null
          group_coaching?: boolean | null
          group_max_size?: number | null
          group_price_gbp?: number | null
          instagram_handle?: string | null
          is_coach_pro?: boolean | null
          is_featured?: boolean | null
          language_tags?: string[] | null
          location?: string | null
          max_athletes?: number | null
          photo_url?: string | null
          rate_monthly_gbp?: number | null
          rate_plan_gbp?: number | null
          referral_code?: string | null
          review_count?: number | null
          slug?: string
          specialities?: string[] | null
          specialty_tags?: string[] | null
          strava_profile?: string | null
          stripe_account_id?: string | null
          timezone?: string | null
          total_athletes?: number | null
          uka_number?: string | null
          updated_at?: string
          user_id?: string
          verification_tier?: string | null
          verified?: boolean | null
          video_intro_seconds?: number | null
          video_intro_url?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      coach_referrals: {
        Row: {
          created_at: string | null
          id: string
          referral_code: string
          referred_id: string | null
          referrer_id: string
          reward_amount_gbp: number | null
          reward_paid_at: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          referral_code: string
          referred_id?: string | null
          referrer_id: string
          reward_amount_gbp?: number | null
          reward_paid_at?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          referral_code?: string
          referred_id?: string | null
          referrer_id?: string
          reward_amount_gbp?: number | null
          reward_paid_at?: string | null
          status?: string | null
        }
        Relationships: []
      }
      coach_reviews: {
        Row: {
          athlete_id: string
          coach_athlete_id: string | null
          coach_id: string
          created_at: string | null
          flag_reason: string | null
          id: string
          is_anonymous: boolean | null
          is_flagged: boolean | null
          published_at: string | null
          rating: number
          review_text: string | null
          would_recommend: boolean | null
        }
        Insert: {
          athlete_id: string
          coach_athlete_id?: string | null
          coach_id: string
          created_at?: string | null
          flag_reason?: string | null
          id?: string
          is_anonymous?: boolean | null
          is_flagged?: boolean | null
          published_at?: string | null
          rating: number
          review_text?: string | null
          would_recommend?: boolean | null
        }
        Update: {
          athlete_id?: string
          coach_athlete_id?: string | null
          coach_id?: string
          created_at?: string | null
          flag_reason?: string | null
          id?: string
          is_anonymous?: boolean | null
          is_flagged?: boolean | null
          published_at?: string | null
          rating?: number
          review_text?: string | null
          would_recommend?: boolean | null
        }
        Relationships: []
      }
      coaching_subscriptions: {
        Row: {
          amount_gbp: number
          athlete_id: string
          billing_interval: string | null
          cancelled_at: string | null
          coach_id: string
          coach_payout_gbp: number
          commission_gbp: number
          commission_rate: number
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          dispute_opened_at: string | null
          dispute_reason: string | null
          dispute_resolved_at: string | null
          id: string
          status: string
          stripe_payment_intent_id: string | null
          stripe_subscription_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount_gbp: number
          athlete_id: string
          billing_interval?: string | null
          cancelled_at?: string | null
          coach_id: string
          coach_payout_gbp: number
          commission_gbp: number
          commission_rate: number
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          dispute_opened_at?: string | null
          dispute_reason?: string | null
          dispute_resolved_at?: string | null
          id?: string
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount_gbp?: number
          athlete_id?: string
          billing_interval?: string | null
          cancelled_at?: string | null
          coach_id?: string
          coach_payout_gbp?: number
          commission_gbp?: number
          commission_rate?: number
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          dispute_opened_at?: string | null
          dispute_reason?: string | null
          dispute_resolved_at?: string | null
          id?: string
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      cron_runs: {
        Row: {
          duration_ms: number | null
          error_message: string | null
          finished_at: string | null
          id: string
          job: string
          ok: boolean
          result: Json | null
          started_at: string
        }
        Insert: {
          duration_ms?: number | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          job: string
          ok?: boolean
          result?: Json | null
          started_at?: string
        }
        Update: {
          duration_ms?: number | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          job?: string
          ok?: boolean
          result?: Json | null
          started_at?: string
        }
        Relationships: []
      }
      featured_plans: {
        Row: {
          clicks: number | null
          conversions: number | null
          created_at: string | null
          feature_type: string | null
          id: string
          impressions: number | null
          position: number | null
          template_id: string
          week_start: string
        }
        Insert: {
          clicks?: number | null
          conversions?: number | null
          created_at?: string | null
          feature_type?: string | null
          id?: string
          impressions?: number | null
          position?: number | null
          template_id: string
          week_start: string
        }
        Update: {
          clicks?: number | null
          conversions?: number | null
          created_at?: string | null
          feature_type?: string | null
          id?: string
          impressions?: number | null
          position?: number | null
          template_id?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "featured_plans_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "plan_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          admin_notes: string | null
          created_at: string
          feedback_type: string
          id: string
          message: string
          page: string | null
          rating: number | null
          status: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          feedback_type: string
          id?: string
          message: string
          page?: string | null
          rating?: number | null
          status?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          feedback_type?: string
          id?: string
          message?: string
          page?: string | null
          rating?: number | null
          status?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      group_coaching_enrolments: {
        Row: {
          amount_gbp: number
          athlete_id: string
          enrolled_at: string | null
          id: string
          session_id: string
          status: string | null
          stripe_payment_intent_id: string | null
        }
        Insert: {
          amount_gbp: number
          athlete_id: string
          enrolled_at?: string | null
          id?: string
          session_id: string
          status?: string | null
          stripe_payment_intent_id?: string | null
        }
        Update: {
          amount_gbp?: number
          athlete_id?: string
          enrolled_at?: string | null
          id?: string
          session_id?: string
          status?: string | null
          stripe_payment_intent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_coaching_enrolments_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "group_coaching_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      group_coaching_sessions: {
        Row: {
          coach_id: string
          created_at: string | null
          description: string | null
          id: string
          max_participants: number | null
          name: string
          price_gbp: number
          start_date: string
          status: string | null
          template_id: string | null
        }
        Insert: {
          coach_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          max_participants?: number | null
          name: string
          price_gbp: number
          start_date: string
          status?: string | null
          template_id?: string | null
        }
        Update: {
          coach_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          max_participants?: number | null
          name?: string
          price_gbp?: number
          start_date?: string
          status?: string | null
          template_id?: string | null
        }
        Relationships: []
      }
      gym_logs: {
        Row: {
          day_i: number
          exercises: Json
          id: string
          logged_at: string
          plan_id: string
          session_i: number
          user_id: string
          week_n: number
        }
        Insert: {
          day_i: number
          exercises?: Json
          id?: string
          logged_at?: string
          plan_id: string
          session_i: number
          user_id: string
          week_n: number
        }
        Update: {
          day_i?: number
          exercises?: Json
          id?: string
          logged_at?: string
          plan_id?: string
          session_i?: number
          user_id?: string
          week_n?: number
        }
        Relationships: [
          {
            foreignKeyName: "gym_logs_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "user_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_plan_entries: {
        Row: {
          carbs_total: number | null
          created_at: string | null
          fat_total: number | null
          id: string
          kcal_total: number | null
          meal_slot: string
          name: string | null
          plan_date: string
          portions: number
          protein_total: number | null
          recipe_id: string | null
          user_id: string
        }
        Insert: {
          carbs_total?: number | null
          created_at?: string | null
          fat_total?: number | null
          id?: string
          kcal_total?: number | null
          meal_slot: string
          name?: string | null
          plan_date: string
          portions?: number
          protein_total?: number | null
          recipe_id?: string | null
          user_id: string
        }
        Update: {
          carbs_total?: number | null
          created_at?: string | null
          fat_total?: number | null
          id?: string
          kcal_total?: number | null
          meal_slot?: string
          name?: string | null
          plan_date?: string
          portions?: number
          protein_total?: number | null
          recipe_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_plan_entries_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          data: Json | null
          id: string
          read: boolean
          title: string | null
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          read?: boolean
          title?: string | null
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          read?: boolean
          title?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      nps_responses: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          score: number
          trigger: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          score: number
          trigger: string
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          score?: number
          trigger?: string
          user_id?: string
        }
        Relationships: []
      }
      plan_phases: {
        Row: {
          end_week: number
          id: string
          label: string
          notes: string | null
          phase_type: string
          plan_id: string
          start_week: number
        }
        Insert: {
          end_week: number
          id?: string
          label: string
          notes?: string | null
          phase_type: string
          plan_id: string
          start_week: number
        }
        Update: {
          end_week?: number
          id?: string
          label?: string
          notes?: string | null
          phase_type?: string
          plan_id?: string
          start_week?: number
        }
        Relationships: [
          {
            foreignKeyName: "plan_phases_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "user_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_purchases: {
        Row: {
          amount_gbp: number
          athlete_id: string
          coach_id: string | null
          coach_payout_gbp: number | null
          id: string
          platform_fee_gbp: number | null
          purchased_at: string
          stripe_payment_id: string | null
          template_id: string
        }
        Insert: {
          amount_gbp: number
          athlete_id: string
          coach_id?: string | null
          coach_payout_gbp?: number | null
          id?: string
          platform_fee_gbp?: number | null
          purchased_at?: string
          stripe_payment_id?: string | null
          template_id: string
        }
        Update: {
          amount_gbp?: number
          athlete_id?: string
          coach_id?: string | null
          coach_payout_gbp?: number | null
          id?: string
          platform_fee_gbp?: number | null
          purchased_at?: string
          stripe_payment_id?: string | null
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_purchases_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coach_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "plan_purchases_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "plan_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_templates: {
        Row: {
          author_id: string | null
          author_type: string | null
          avg_completion_rate: number | null
          avg_rating: number | null
          created_at: string
          description: string | null
          distance: string
          id: string
          is_public: boolean | null
          level: string
          longest_run_km: number | null
          meta: Json | null
          name: string
          peak_km_week: number | null
          preview_weeks: number | null
          price_gbp: number | null
          review_count: number | null
          runs_per_week: number
          slug: string
          subtitle: string | null
          total_completions: number | null
          total_starts: number | null
          weeks_data: Json
          weeks_max: number
          weeks_min: number
        }
        Insert: {
          author_id?: string | null
          author_type?: string | null
          avg_completion_rate?: number | null
          avg_rating?: number | null
          created_at?: string
          description?: string | null
          distance: string
          id?: string
          is_public?: boolean | null
          level: string
          longest_run_km?: number | null
          meta?: Json | null
          name: string
          peak_km_week?: number | null
          preview_weeks?: number | null
          price_gbp?: number | null
          review_count?: number | null
          runs_per_week: number
          slug: string
          subtitle?: string | null
          total_completions?: number | null
          total_starts?: number | null
          weeks_data: Json
          weeks_max: number
          weeks_min: number
        }
        Update: {
          author_id?: string | null
          author_type?: string | null
          avg_completion_rate?: number | null
          avg_rating?: number | null
          created_at?: string
          description?: string | null
          distance?: string
          id?: string
          is_public?: boolean | null
          level?: string
          longest_run_km?: number | null
          meta?: Json | null
          name?: string
          peak_km_week?: number | null
          preview_weeks?: number | null
          price_gbp?: number | null
          review_count?: number | null
          runs_per_week?: number
          slug?: string
          subtitle?: string | null
          total_completions?: number | null
          total_starts?: number | null
          weeks_data?: Json
          weeks_max?: number
          weeks_min?: number
        }
        Relationships: [
          {
            foreignKeyName: "plan_templates_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "coach_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          age: number | null
          at_risk_sent_at: string | null
          avatar_accessories: Json | null
          biological_sex: string | null
          character_config: Json | null
          coach_applied_at: string | null
          coach_tier: string | null
          coach_verified: boolean | null
          created_at: string
          current_league: string | null
          dark_mode: boolean | null
          display_name: string | null
          experience: string | null
          first_session_logged_at: string | null
          gym_enabled: boolean | null
          gym_equipment: string[] | null
          gym_focus: string | null
          gym_sessions_per_week: number | null
          handle: string | null
          health_flags: string[] | null
          id: string
          injury_notes: string | null
          is_coach: boolean | null
          is_pro: boolean | null
          is_split_leader: boolean | null
          last_notification_at: string | null
          lifecycle_email_sent: string[] | null
          longest_recent_run: number | null
          notif_adaptation_alert: boolean | null
          notif_at_risk_reengagement: boolean | null
          notif_class_revealed: boolean | null
          notif_coach_message: boolean | null
          notif_race_countdown: boolean | null
          notif_session_reminder: boolean | null
          notif_streak_at_risk: boolean | null
          notif_weekly_recap: boolean | null
          notification_time: string | null
          notifications_enabled: boolean | null
          nutrition_settings: Json | null
          onboarding_complete: boolean | null
          onboarding_step: number | null
          preferred_long_run_day: string | null
          preferred_run_time: string | null
          pro_expires_at: string | null
          recent_race_times: Json | null
          referral_code: string | null
          referral_count: number | null
          referral_reward_given_at: string | null
          referral_reward_months: number
          referred_by: string | null
          run_surfaces: string[] | null
          runner_class: string | null
          runner_class_revealed: boolean | null
          runner_class_updated_at: string | null
          runner_colour: string | null
          running_experience: string | null
          season_xp: number | null
          share_logs_with_squad: boolean
          split_leader_reward_months: number | null
          split_leader_reward_weeks: number | null
          split_leader_squad_id: string | null
          split_leader_total_conversions: number | null
          sport_focus: string[] | null
          stripe_customer_id: string | null
          stripe_price_id: string | null
          stripe_subscription_id: string | null
          subscription_status: string | null
          target_weight: number | null
          text_size: string | null
          timezone: string | null
          total_club_km: number | null
          training_days: number | null
          trial_ended_at: string | null
          trial_source: string | null
          trial_started_at: string | null
          trial_warned_at: string | null
          units: string | null
          updated_at: string
          week_start: string
          weekly_km_current: number | null
          weight_kg: number | null
          xp_rate_multiplier: number
        }
        Insert: {
          age?: number | null
          at_risk_sent_at?: string | null
          avatar_accessories?: Json | null
          biological_sex?: string | null
          character_config?: Json | null
          coach_applied_at?: string | null
          coach_tier?: string | null
          coach_verified?: boolean | null
          created_at?: string
          current_league?: string | null
          dark_mode?: boolean | null
          display_name?: string | null
          experience?: string | null
          first_session_logged_at?: string | null
          gym_enabled?: boolean | null
          gym_equipment?: string[] | null
          gym_focus?: string | null
          gym_sessions_per_week?: number | null
          handle?: string | null
          health_flags?: string[] | null
          id: string
          injury_notes?: string | null
          is_coach?: boolean | null
          is_pro?: boolean | null
          is_split_leader?: boolean | null
          last_notification_at?: string | null
          lifecycle_email_sent?: string[] | null
          longest_recent_run?: number | null
          notif_adaptation_alert?: boolean | null
          notif_at_risk_reengagement?: boolean | null
          notif_class_revealed?: boolean | null
          notif_coach_message?: boolean | null
          notif_race_countdown?: boolean | null
          notif_session_reminder?: boolean | null
          notif_streak_at_risk?: boolean | null
          notif_weekly_recap?: boolean | null
          notification_time?: string | null
          notifications_enabled?: boolean | null
          nutrition_settings?: Json | null
          onboarding_complete?: boolean | null
          onboarding_step?: number | null
          preferred_long_run_day?: string | null
          preferred_run_time?: string | null
          pro_expires_at?: string | null
          recent_race_times?: Json | null
          referral_code?: string | null
          referral_count?: number | null
          referral_reward_given_at?: string | null
          referral_reward_months?: number
          referred_by?: string | null
          run_surfaces?: string[] | null
          runner_class?: string | null
          runner_class_revealed?: boolean | null
          runner_class_updated_at?: string | null
          runner_colour?: string | null
          running_experience?: string | null
          season_xp?: number | null
          share_logs_with_squad?: boolean
          split_leader_reward_months?: number | null
          split_leader_reward_weeks?: number | null
          split_leader_squad_id?: string | null
          split_leader_total_conversions?: number | null
          sport_focus?: string[] | null
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          target_weight?: number | null
          text_size?: string | null
          timezone?: string | null
          total_club_km?: number | null
          training_days?: number | null
          trial_ended_at?: string | null
          trial_source?: string | null
          trial_started_at?: string | null
          trial_warned_at?: string | null
          units?: string | null
          updated_at?: string
          week_start?: string
          weekly_km_current?: number | null
          weight_kg?: number | null
          xp_rate_multiplier?: number
        }
        Update: {
          age?: number | null
          at_risk_sent_at?: string | null
          avatar_accessories?: Json | null
          biological_sex?: string | null
          character_config?: Json | null
          coach_applied_at?: string | null
          coach_tier?: string | null
          coach_verified?: boolean | null
          created_at?: string
          current_league?: string | null
          dark_mode?: boolean | null
          display_name?: string | null
          experience?: string | null
          first_session_logged_at?: string | null
          gym_enabled?: boolean | null
          gym_equipment?: string[] | null
          gym_focus?: string | null
          gym_sessions_per_week?: number | null
          handle?: string | null
          health_flags?: string[] | null
          id?: string
          injury_notes?: string | null
          is_coach?: boolean | null
          is_pro?: boolean | null
          is_split_leader?: boolean | null
          last_notification_at?: string | null
          lifecycle_email_sent?: string[] | null
          longest_recent_run?: number | null
          notif_adaptation_alert?: boolean | null
          notif_at_risk_reengagement?: boolean | null
          notif_class_revealed?: boolean | null
          notif_coach_message?: boolean | null
          notif_race_countdown?: boolean | null
          notif_session_reminder?: boolean | null
          notif_streak_at_risk?: boolean | null
          notif_weekly_recap?: boolean | null
          notification_time?: string | null
          notifications_enabled?: boolean | null
          nutrition_settings?: Json | null
          onboarding_complete?: boolean | null
          onboarding_step?: number | null
          preferred_long_run_day?: string | null
          preferred_run_time?: string | null
          pro_expires_at?: string | null
          recent_race_times?: Json | null
          referral_code?: string | null
          referral_count?: number | null
          referral_reward_given_at?: string | null
          referral_reward_months?: number
          referred_by?: string | null
          run_surfaces?: string[] | null
          runner_class?: string | null
          runner_class_revealed?: boolean | null
          runner_class_updated_at?: string | null
          runner_colour?: string | null
          running_experience?: string | null
          season_xp?: number | null
          share_logs_with_squad?: boolean
          split_leader_reward_months?: number | null
          split_leader_reward_weeks?: number | null
          split_leader_squad_id?: string | null
          split_leader_total_conversions?: number | null
          sport_focus?: string[] | null
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          target_weight?: number | null
          text_size?: string | null
          timezone?: string | null
          total_club_km?: number | null
          training_days?: number | null
          trial_ended_at?: string | null
          trial_source?: string | null
          trial_started_at?: string | null
          trial_warned_at?: string | null
          units?: string | null
          updated_at?: string
          week_start?: string
          weekly_km_current?: number | null
          weight_kg?: number | null
          xp_rate_multiplier?: number
        }
        Relationships: [
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_split_leader_squad_id_fkey"
            columns: ["split_leader_squad_id"]
            isOneToOne: false
            referencedRelation: "squads"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string | null
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string | null
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string | null
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      races: {
        Row: {
          actual_time_secs: number | null
          created_at: string
          distance_km: number | null
          distance_label: string | null
          goal_time_secs: number | null
          id: string
          location: string | null
          name: string
          notes: string | null
          plan_id: string | null
          priority: string | null
          race_date: string
          user_id: string
        }
        Insert: {
          actual_time_secs?: number | null
          created_at?: string
          distance_km?: number | null
          distance_label?: string | null
          goal_time_secs?: number | null
          id?: string
          location?: string | null
          name: string
          notes?: string | null
          plan_id?: string | null
          priority?: string | null
          race_date: string
          user_id: string
        }
        Update: {
          actual_time_secs?: number | null
          created_at?: string
          distance_km?: number | null
          distance_label?: string | null
          goal_time_secs?: number | null
          id?: string
          location?: string | null
          name?: string
          notes?: string | null
          plan_id?: string | null
          priority?: string | null
          race_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "races_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "user_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          carbs_total: number | null
          created_at: string | null
          fat_total: number | null
          id: string
          ingredients: Json | null
          kcal_total: number | null
          name: string
          notes: string | null
          protein_total: number | null
          servings: number
          user_id: string
        }
        Insert: {
          carbs_total?: number | null
          created_at?: string | null
          fat_total?: number | null
          id?: string
          ingredients?: Json | null
          kcal_total?: number | null
          name: string
          notes?: string | null
          protein_total?: number | null
          servings?: number
          user_id: string
        }
        Update: {
          carbs_total?: number | null
          created_at?: string | null
          fat_total?: number | null
          id?: string
          ingredients?: Json | null
          kcal_total?: number | null
          name?: string
          notes?: string | null
          protein_total?: number | null
          servings?: number
          user_id?: string
        }
        Relationships: []
      }
      seasons: {
        Row: {
          created_at: string | null
          ends_at: string
          id: string
          is_active: boolean | null
          name: string
          number: number
          starts_at: string
        }
        Insert: {
          created_at?: string | null
          ends_at: string
          id?: string
          is_active?: boolean | null
          name: string
          number: number
          starts_at: string
        }
        Update: {
          created_at?: string | null
          ends_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
          number?: number
          starts_at?: string
        }
        Relationships: []
      }
      session_annotations: {
        Row: {
          acknowledged_at: string | null
          athlete_id: string
          coach_id: string
          created_at: string
          day_i: number
          id: string
          note: string | null
          plan_id: string
          reaction: string | null
          session_i: number
          week_n: number
        }
        Insert: {
          acknowledged_at?: string | null
          athlete_id: string
          coach_id: string
          created_at?: string
          day_i: number
          id?: string
          note?: string | null
          plan_id: string
          reaction?: string | null
          session_i: number
          week_n: number
        }
        Update: {
          acknowledged_at?: string | null
          athlete_id?: string
          coach_id?: string
          created_at?: string
          day_i?: number
          id?: string
          note?: string | null
          plan_id?: string
          reaction?: string | null
          session_i?: number
          week_n?: number
        }
        Relationships: [
          {
            foreignKeyName: "session_annotations_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coach_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      sport_interest_waitlist: {
        Row: {
          created_at: string
          id: string
          sport: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          sport: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          sport?: string
          user_id?: string | null
        }
        Relationships: []
      }
      squad_achievements: {
        Row: {
          description: string | null
          earned_at: string
          icon: string | null
          id: string
          metadata: Json | null
          season_period: string
          season_type: string
          squad_id: string
          type: string
        }
        Insert: {
          description?: string | null
          earned_at?: string
          icon?: string | null
          id?: string
          metadata?: Json | null
          season_period: string
          season_type: string
          squad_id: string
          type: string
        }
        Update: {
          description?: string | null
          earned_at?: string
          icon?: string | null
          id?: string
          metadata?: Json | null
          season_period?: string
          season_type?: string
          squad_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "squad_achievements_squad_id_fkey"
            columns: ["squad_id"]
            isOneToOne: false
            referencedRelation: "squads"
            referencedColumns: ["id"]
          },
        ]
      }
      squad_feed: {
        Row: {
          created_at: string
          id: string
          milestone_type: string
          squad_id: string
          training_log_id: string | null
          user_id: string
          value_km: number | null
          value_secs: number | null
          value_streak: number | null
          value_text: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          milestone_type: string
          squad_id: string
          training_log_id?: string | null
          user_id: string
          value_km?: number | null
          value_secs?: number | null
          value_streak?: number | null
          value_text?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          milestone_type?: string
          squad_id?: string
          training_log_id?: string | null
          user_id?: string
          value_km?: number | null
          value_secs?: number | null
          value_streak?: number | null
          value_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "squad_feed_squad_id_fkey"
            columns: ["squad_id"]
            isOneToOne: false
            referencedRelation: "squads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "squad_feed_training_log_id_fkey"
            columns: ["training_log_id"]
            isOneToOne: false
            referencedRelation: "training_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      squad_feed_reactions: {
        Row: {
          created_at: string
          feed_item_id: string
          id: string
          reaction: string
          user_id: string
        }
        Insert: {
          created_at?: string
          feed_item_id: string
          id?: string
          reaction: string
          user_id: string
        }
        Update: {
          created_at?: string
          feed_item_id?: string
          id?: string
          reaction?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "squad_feed_reactions_feed_item_id_fkey"
            columns: ["feed_item_id"]
            isOneToOne: false
            referencedRelation: "squad_feed"
            referencedColumns: ["id"]
          },
        ]
      }
      squad_invites: {
        Row: {
          code: string
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          max_uses: number | null
          squad_id: string
          uses: number | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          squad_id: string
          uses?: number | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          squad_id?: string
          uses?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "squad_invites_squad_id_fkey"
            columns: ["squad_id"]
            isOneToOne: false
            referencedRelation: "squads"
            referencedColumns: ["id"]
          },
        ]
      }
      squad_members: {
        Row: {
          converted_via_invite: boolean | null
          id: string
          inactivity_prompted_at: string | null
          invite_code: string | null
          invited_by: string | null
          is_premium_at_join: boolean | null
          joined_at: string
          last_active_at: string | null
          removed_at: string | null
          removed_by: string | null
          squad_id: string
          user_id: string
        }
        Insert: {
          converted_via_invite?: boolean | null
          id?: string
          inactivity_prompted_at?: string | null
          invite_code?: string | null
          invited_by?: string | null
          is_premium_at_join?: boolean | null
          joined_at?: string
          last_active_at?: string | null
          removed_at?: string | null
          removed_by?: string | null
          squad_id: string
          user_id: string
        }
        Update: {
          converted_via_invite?: boolean | null
          id?: string
          inactivity_prompted_at?: string | null
          invite_code?: string | null
          invited_by?: string | null
          is_premium_at_join?: boolean | null
          joined_at?: string
          last_active_at?: string | null
          removed_at?: string | null
          removed_by?: string | null
          squad_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "squad_members_squad_id_fkey"
            columns: ["squad_id"]
            isOneToOne: false
            referencedRelation: "squads"
            referencedColumns: ["id"]
          },
        ]
      }
      squad_nudges: {
        Row: {
          dismissed_at: string | null
          from_user: string
          id: string
          message_key: string
          opened_at: string | null
          queued_for_date: string | null
          sent_at: string
          squad_id: string
          template_variant: string
          to_user: string
        }
        Insert: {
          dismissed_at?: string | null
          from_user: string
          id?: string
          message_key: string
          opened_at?: string | null
          queued_for_date?: string | null
          sent_at?: string
          squad_id: string
          template_variant?: string
          to_user: string
        }
        Update: {
          dismissed_at?: string | null
          from_user?: string
          id?: string
          message_key?: string
          opened_at?: string | null
          queued_for_date?: string | null
          sent_at?: string
          squad_id?: string
          template_variant?: string
          to_user?: string
        }
        Relationships: [
          {
            foreignKeyName: "squad_nudges_squad_id_fkey"
            columns: ["squad_id"]
            isOneToOne: false
            referencedRelation: "squads"
            referencedColumns: ["id"]
          },
        ]
      }
      squad_seasons: {
        Row: {
          active_members: number | null
          created_at: string
          goal_hit: boolean | null
          goal_type: string | null
          goal_value: number | null
          id: string
          period: string
          season_type: string
          snapshot_at: string | null
          squad_id: string
          top_runner_id: string | null
          top_runner_km: number | null
          top_runner_name: string | null
          total_km: number | null
          total_sessions: number | null
        }
        Insert: {
          active_members?: number | null
          created_at?: string
          goal_hit?: boolean | null
          goal_type?: string | null
          goal_value?: number | null
          id?: string
          period: string
          season_type: string
          snapshot_at?: string | null
          squad_id: string
          top_runner_id?: string | null
          top_runner_km?: number | null
          top_runner_name?: string | null
          total_km?: number | null
          total_sessions?: number | null
        }
        Update: {
          active_members?: number | null
          created_at?: string
          goal_hit?: boolean | null
          goal_type?: string | null
          goal_value?: number | null
          id?: string
          period?: string
          season_type?: string
          snapshot_at?: string | null
          squad_id?: string
          top_runner_id?: string | null
          top_runner_km?: number | null
          top_runner_name?: string | null
          total_km?: number | null
          total_sessions?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "squad_seasons_squad_id_fkey"
            columns: ["squad_id"]
            isOneToOne: false
            referencedRelation: "squads"
            referencedColumns: ["id"]
          },
        ]
      }
      squads: {
        Row: {
          coach_prompt_shown_at: string | null
          colour: string | null
          created_at: string
          disband_reason: string | null
          disbanded_at: string | null
          goal_month: string | null
          goal_type: string | null
          goal_value: number | null
          id: string
          inactivity_warning_sent_at: string | null
          is_public: boolean | null
          last_activity_at: string | null
          leader_id: string
          logo_url: string | null
          name: string
          slug: string
          total_km_all_time: number | null
          total_sessions_all_time: number | null
          updated_at: string
          welcome_msg: string | null
        }
        Insert: {
          coach_prompt_shown_at?: string | null
          colour?: string | null
          created_at?: string
          disband_reason?: string | null
          disbanded_at?: string | null
          goal_month?: string | null
          goal_type?: string | null
          goal_value?: number | null
          id?: string
          inactivity_warning_sent_at?: string | null
          is_public?: boolean | null
          last_activity_at?: string | null
          leader_id: string
          logo_url?: string | null
          name: string
          slug: string
          total_km_all_time?: number | null
          total_sessions_all_time?: number | null
          updated_at?: string
          welcome_msg?: string | null
        }
        Update: {
          coach_prompt_shown_at?: string | null
          colour?: string | null
          created_at?: string
          disband_reason?: string | null
          disbanded_at?: string | null
          goal_month?: string | null
          goal_type?: string | null
          goal_value?: number | null
          id?: string
          inactivity_warning_sent_at?: string | null
          is_public?: boolean | null
          last_activity_at?: string | null
          leader_id?: string
          logo_url?: string | null
          name?: string
          slug?: string
          total_km_all_time?: number | null
          total_sessions_all_time?: number | null
          updated_at?: string
          welcome_msg?: string | null
        }
        Relationships: []
      }
      strava_connections: {
        Row: {
          access_token: string
          athlete_id: number
          connected_at: string
          id: string
          refresh_token: string
          token_expires_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          athlete_id: number
          connected_at?: string
          id?: string
          refresh_token: string
          token_expires_at: string
          user_id: string
        }
        Update: {
          access_token?: string
          athlete_id?: number
          connected_at?: string
          id?: string
          refresh_token?: string
          token_expires_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string | null
          current_period_end: string | null
          id: string
          status: string
          stripe_customer_id: string | null
          stripe_sub_id: string | null
          tier: string
          trial_end: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_period_end?: string | null
          id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_sub_id?: string | null
          tier?: string
          trial_end?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_period_end?: string | null
          id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_sub_id?: string | null
          tier?: string
          trial_end?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      training_logs: {
        Row: {
          created_at: string
          day_i: number
          done: boolean
          duration_secs: number | null
          effort: number | null
          hr: number | null
          id: string
          km: number | null
          logged_at: string
          notes: string | null
          pace: string | null
          plan_id: string
          session_i: number
          splits: Json | null
          strava_id: number | null
          updated_at: string
          user_id: string
          week_n: number
        }
        Insert: {
          created_at?: string
          day_i: number
          done?: boolean
          duration_secs?: number | null
          effort?: number | null
          hr?: number | null
          id?: string
          km?: number | null
          logged_at?: string
          notes?: string | null
          pace?: string | null
          plan_id: string
          session_i: number
          splits?: Json | null
          strava_id?: number | null
          updated_at?: string
          user_id: string
          week_n: number
        }
        Update: {
          created_at?: string
          day_i?: number
          done?: boolean
          duration_secs?: number | null
          effort?: number | null
          hr?: number | null
          id?: string
          km?: number | null
          logged_at?: string
          notes?: string | null
          pace?: string | null
          plan_id?: string
          session_i?: number
          splits?: Json | null
          strava_id?: number | null
          updated_at?: string
          user_id?: string
          week_n?: number
        }
        Relationships: [
          {
            foreignKeyName: "training_logs_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "user_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      user_goals: {
        Row: {
          actual_time_secs: number | null
          created_at: string
          goal_type: string
          id: string
          notes: string | null
          priority: string
          race_date: string | null
          race_distance_km: number | null
          race_distance_label: string | null
          race_name: string | null
          status: string
          target_time_secs: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          actual_time_secs?: number | null
          created_at?: string
          goal_type: string
          id?: string
          notes?: string | null
          priority?: string
          race_date?: string | null
          race_distance_km?: number | null
          race_distance_label?: string | null
          race_name?: string | null
          status?: string
          target_time_secs?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          actual_time_secs?: number | null
          created_at?: string
          goal_type?: string
          id?: string
          notes?: string | null
          priority?: string
          race_date?: string | null
          race_distance_km?: number | null
          race_distance_label?: string | null
          race_name?: string | null
          status?: string
          target_time_secs?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_plans: {
        Row: {
          archived_at: string | null
          completed_at: string | null
          created_at: string
          current_week: number
          deleted_at: string | null
          goal: string | null
          id: string
          meta: Json | null
          name: string
          plan_type: string
          race_date: string | null
          start_date: string
          status: string
          template_id: string | null
          total_weeks: number
          updated_at: string
          user_id: string
          weeks_data: Json
        }
        Insert: {
          archived_at?: string | null
          completed_at?: string | null
          created_at?: string
          current_week?: number
          deleted_at?: string | null
          goal?: string | null
          id?: string
          meta?: Json | null
          name: string
          plan_type: string
          race_date?: string | null
          start_date?: string
          status?: string
          template_id?: string | null
          total_weeks: number
          updated_at?: string
          user_id: string
          weeks_data?: Json
        }
        Update: {
          archived_at?: string | null
          completed_at?: string | null
          created_at?: string
          current_week?: number
          deleted_at?: string | null
          goal?: string | null
          id?: string
          meta?: Json | null
          name?: string
          plan_type?: string
          race_date?: string | null
          start_date?: string
          status?: string
          template_id?: string | null
          total_weeks?: number
          updated_at?: string
          user_id?: string
          weeks_data?: Json
        }
        Relationships: [
          {
            foreignKeyName: "user_plans_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "plan_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      virtual_race_entries: {
        Row: {
          dns: boolean | null
          finish_time_secs: number | null
          id: string
          joined_at: string | null
          pace: string | null
          position: number | null
          race_id: string
          submitted_at: string | null
          user_id: string
        }
        Insert: {
          dns?: boolean | null
          finish_time_secs?: number | null
          id?: string
          joined_at?: string | null
          pace?: string | null
          position?: number | null
          race_id: string
          submitted_at?: string | null
          user_id: string
        }
        Update: {
          dns?: boolean | null
          finish_time_secs?: number | null
          id?: string
          joined_at?: string | null
          pace?: string | null
          position?: number | null
          race_id?: string
          submitted_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "virtual_race_entries_race_id_fkey"
            columns: ["race_id"]
            isOneToOne: false
            referencedRelation: "virtual_races"
            referencedColumns: ["id"]
          },
        ]
      }
      virtual_races: {
        Row: {
          created_at: string | null
          description: string | null
          distance_km: number
          ends_at: string
          entry_count: number | null
          entry_fee_gbp: number | null
          finisher_cert: boolean | null
          id: string
          max_entries: number | null
          name: string
          prize_pool: string | null
          starts_at: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          distance_km: number
          ends_at: string
          entry_count?: number | null
          entry_fee_gbp?: number | null
          finisher_cert?: boolean | null
          id?: string
          max_entries?: number | null
          name: string
          prize_pool?: string | null
          starts_at: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          distance_km?: number
          ends_at?: string
          entry_count?: number | null
          entry_fee_gbp?: number | null
          finisher_cert?: boolean | null
          id?: string
          max_entries?: number | null
          name?: string
          prize_pool?: string | null
          starts_at?: string
        }
        Relationships: []
      }
      voice_messages: {
        Row: {
          athlete_id: string
          coach_id: string
          created_at: string | null
          duration_secs: number | null
          id: string
          listened_at: string | null
          session_annotation_id: string | null
          storage_path: string
        }
        Insert: {
          athlete_id: string
          coach_id: string
          created_at?: string | null
          duration_secs?: number | null
          id?: string
          listened_at?: string | null
          session_annotation_id?: string | null
          storage_path: string
        }
        Update: {
          athlete_id?: string
          coach_id?: string
          created_at?: string | null
          duration_secs?: number | null
          id?: string
          listened_at?: string | null
          session_annotation_id?: string | null
          storage_path?: string
        }
        Relationships: []
      }
      wellness_logs: {
        Row: {
          created_at: string
          energy: number | null
          id: string
          log_date: string
          log_type: string
          mood: number | null
          notes: string | null
          sleep: number | null
          soreness: number | null
          stress: number | null
          user_id: string
          weight_kg: number | null
        }
        Insert: {
          created_at?: string
          energy?: number | null
          id?: string
          log_date: string
          log_type?: string
          mood?: number | null
          notes?: string | null
          sleep?: number | null
          soreness?: number | null
          stress?: number | null
          user_id: string
          weight_kg?: number | null
        }
        Update: {
          created_at?: string
          energy?: number | null
          id?: string
          log_date?: string
          log_type?: string
          mood?: number | null
          notes?: string | null
          sleep?: number | null
          soreness?: number | null
          stress?: number | null
          user_id?: string
          weight_kg?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_split_leader_reward: {
        Args: { p_leader_id: string; p_type?: string }
        Returns: undefined
      }
      award_session_xp: {
        Args: { p_base_xp?: number; p_session_type: string; p_user_id: string }
        Returns: {
          build_class: string
          endurance_delta: number
          multiplier_applied: number
          new_level: number
          new_xp: number
          resilience_delta: number
          speed_delta: number
          xp_awarded: number
        }[]
      }
      bump_plan_template_completions: {
        Args: { p_template_id: string }
        Returns: undefined
      }
      bump_plan_template_starts: {
        Args: { p_template_id: string }
        Returns: undefined
      }
      can_nudge: { Args: { p_from: string; p_to: string }; Returns: boolean }
      claim_daily_quest: {
        Args: { p_quest_id: string; p_user_id: string }
        Returns: {
          item_id: string
          item_kind: string
          period_key: string
          quest_id: string
        }[]
      }
      claim_founding_spot: { Args: never; Returns: number }
      claim_streak_reward: {
        Args: { p_streak_days: number; p_user_id: string }
        Returns: {
          item_id: string
          item_kind: string
          milestone: number
        }[]
      }
      coach_earnings_summary: {
        Args: { p_coach_id: string }
        Returns: {
          commission_gbp: number
          gross_gbp: number
          net_gbp: number
          period_month: string
          source_count: number
        }[]
      }
      coach_earnings_ytd: {
        Args: { p_coach_id: string }
        Returns: {
          commission_gbp: number
          gross_gbp: number
          net_gbp: number
        }[]
      }
      consume_boost: {
        Args: { p_boost_id: string }
        Returns: {
          acquired_at: string
          boost_id: string
          quantity: number
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "character_boost_inventory"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      credit_referral_reward_if_eligible: { Args: never; Returns: Json }
      decrement_club_members: {
        Args: { p_club_id: string }
        Returns: undefined
      }
      delete_user_account: { Args: { p_user_id: string }; Returns: undefined }
      enter_race: {
        Args: { p_boost_loadout?: string[]; p_race_id: string }
        Returns: {
          boost_loadout: Json
          character_snapshot: Json
          entered_at: string
          id: string
          race_id: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "character_race_entries"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      expire_overdue_trials: {
        Args: never
        Returns: {
          trial_source: string
          user_id: string
        }[]
      }
      expire_trial_if_due: { Args: never; Returns: boolean }
      export_user_data: { Args: { p_user_id: string }; Returns: Json }
      generate_coach_referral_code: {
        Args: { p_coach_id: string }
        Returns: string
      }
      get_commission_rate: { Args: { p_coach_id: string }; Returns: number }
      grant_boost: {
        Args: { p_boost_id: string; p_quantity?: number; p_user_id: string }
        Returns: {
          acquired_at: string
          boost_id: string
          quantity: number
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "character_boost_inventory"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      grant_cosmetic: {
        Args: { p_cosmetic_id: string; p_user_id: string }
        Returns: {
          acquired_at: string
          cosmetic_id: string
          is_active: boolean
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "character_cosmetic_inventory"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      grant_day8_auto_trials: {
        Args: never
        Returns: {
          trial_source: string
          user_id: string
        }[]
      }
      grant_trial_if_eligible: { Args: { p_source: string }; Returns: boolean }
      increment_profile_xp: {
        Args: { p_season_xp?: number; p_user_id: string; p_xp: number }
        Returns: undefined
      }
      increment_season_xp: {
        Args: { p_user_id: string; p_xp: number }
        Returns: undefined
      }
      increment_token_usage:
        | {
            Args: {
              p_date: string
              p_tokens_in: number
              p_tokens_out: number
              p_user_id: string
            }
            Returns: undefined
          }
        | {
            Args: {
              p_date: string
              p_feature?: string
              p_tokens_in: number
              p_tokens_out: number
              p_user_id: string
            }
            Returns: undefined
          }
        | {
            Args: {
              p_cache_creation_tokens?: number
              p_cache_read_tokens?: number
              p_date: string
              p_feature?: string
              p_tokens_in: number
              p_tokens_out: number
              p_user_id: string
            }
            Returns: undefined
          }
      insert_squad_feed_on_log: {
        Args: { p_log_id: string }
        Returns: string[]
      }
      is_squad_member: { Args: { p_squad_id: string }; Returns: boolean }
      marketplace_coaches: {
        Args: {
          p_distance?: string
          p_language?: string
          p_limit?: number
          p_max_price?: number
          p_offset?: number
          p_specialty?: string
          p_verified_only?: boolean
        }
        Returns: {
          accepting_athletes: boolean
          athlete_type_tags: string[]
          avg_rating: number
          bio: string
          completion_rate: number
          display_name: string
          distance_tags: string[]
          group_coaching: boolean
          group_price_gbp: number
          is_featured: boolean
          location: string
          photo_url: string
          rate_monthly_gbp: number
          rate_plan_gbp: number
          review_count: number
          slug: string
          specialty_tags: string[]
          total_athletes: number
          user_id: string
          verification_tier: string
          verified: boolean
        }[]
      }
      nudge_effectiveness_summary: {
        Args: never
        Returns: {
          dismissed_count: number
          drop_dead_count: number
          drop_dead_rate: number
          message_key: string
          open_rate: number
          opened_count: number
          sent_count: number
          template_variant: string
        }[]
      }
      recompute_xp_rate_multiplier: {
        Args: { p_user_id: string }
        Returns: number
      }
      record_purchase_grant: {
        Args: {
          p_item_id: string
          p_item_kind: string
          p_stripe_session_id: string
          p_user_id: string
        }
        Returns: boolean
      }
      refresh_coach_rating: { Args: { p_coach_id: string }; Returns: undefined }
      reset_season: { Args: never; Returns: undefined }
      reset_weekly_club_km: { Args: never; Returns: undefined }
      roll_random_drop: {
        Args: { p_user_id: string }
        Returns: {
          item_id: string
          kind: string
          rarity: string
        }[]
      }
      seed_daily_race: { Args: never; Returns: string }
      seed_monthly_major: { Args: never; Returns: string }
      seed_weekly_marquee: { Args: never; Returns: string }
      set_active_cosmetic: {
        Args: { p_cosmetic_id: string; p_slot?: string }
        Returns: undefined
      }
      simulate_race: {
        Args: { p_race_id: string }
        Returns: {
          computed_at: string
          finishing_order: Json
          race_id: string
          result_timeline: Json
        }
        SetofOptions: {
          from: "*"
          to: "character_race_results"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      snapshot_squad_season: {
        Args: { p_period: string; p_squad_id: string; p_type: string }
        Returns: undefined
      }
      snapshot_squad_seasons_for_month: {
        Args: { p_period: string }
        Returns: Json
      }
      squad_active_member_count: {
        Args: { p_squad_id: string }
        Returns: number
      }
      squad_alltime_km: { Args: { p_squad_id: string }; Returns: number }
      squad_monthly_km: {
        Args: { p_month?: string; p_squad_id: string }
        Returns: number
      }
      warn_overdue_trials: {
        Args: never
        Returns: {
          trial_source: string
          user_id: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

