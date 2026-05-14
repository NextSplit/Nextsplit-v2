/**
 * Registry of every table that holds user-owned data.
 *
 * Powers two surfaces:
 *   - /api/account/export — UK GDPR Art 15 + Art 20 (access + portability)
 *   - the deletion cron's sanity check before hard-delete
 *
 * The contract is: if a table holds data ABOUT a user — even
 * indirectly — it MUST be listed here. Adding a new user-scoped
 * table without updating this registry will silently break the
 * SAR pipeline (council K33 found 10+ tables silently missing).
 *
 * Each entry maps to:
 *   - `column` — the column that holds the user uuid
 *   - `category` — surfaced in the export JSON as the top-level key
 *
 * When a table holds data on MULTIPLE users (e.g. coach_athletes
 * has both coach_id and athlete_id), declare it once per relevant
 * column so the export captures the user's role on both sides.
 */

export type UserOwnedTable = {
  table:    string
  column:   string
  category: string
  /**
   * If true, the export anonymises the *other* user's id when this
   * row is part of a two-party relationship (e.g. coach_messages
   * exposes a coach's messages — we want the user to see what they
   * sent and received, not the counterparty's id where that would
   * be a privacy leak of the counterparty).
   * Not enforced in the export yet — flagged for future.
   */
  twoParty?: boolean
}

export const USER_OWNED_TABLES: UserOwnedTable[] = [
  // Core profile + audit
  { table: 'profiles',                       column: 'id',         category: 'profile' },
  { table: 'account_lifecycle_events',       column: 'user_id',    category: 'gdpr_audit_trail' },

  // Training data
  { table: 'ai_usage',                       column: 'user_id',    category: 'ai_history' },

  // Coach <-> athlete (rows where the user is on either side)
  { table: 'coach_athletes',                 column: 'athlete_id', category: 'coach_relationships',  twoParty: true },
  { table: 'coach_athletes',                 column: 'coach_id',   category: 'athlete_relationships', twoParty: true },
  { table: 'coach_messages',                 column: 'sender_id',  category: 'coach_messages_sent',  twoParty: true },
  { table: 'coach_messages',                 column: 'recipient_id', category: 'coach_messages_received', twoParty: true },
  { table: 'coach_profiles',                 column: 'user_id',    category: 'coach_profile' },
  { table: 'coach_reviews',                  column: 'athlete_id', category: 'reviews_authored',     twoParty: true },
  { table: 'coach_reviews',                  column: 'coach_id',   category: 'reviews_received',     twoParty: true },
  { table: 'coach_referrals',                column: 'referrer_id', category: 'referrals_made',      twoParty: true },
  { table: 'coach_referrals',                column: 'referred_user_id', category: 'referrals_received', twoParty: true },

  // Financial (post-K33 safe-harbour these may be NULL after anonymisation)
  { table: 'coach_earnings',                 column: 'coach_id',   category: 'coach_earnings',       twoParty: true },
  { table: 'coach_earnings',                 column: 'athlete_id', category: 'coaching_paid',        twoParty: true },
  { table: 'coaching_subscriptions',         column: 'athlete_id', category: 'coaching_subscriptions', twoParty: true },
  { table: 'coaching_subscriptions',         column: 'coach_id',   category: 'coach_subscribers',    twoParty: true },

  // Group coaching
  { table: 'group_coaching_sessions',        column: 'coach_id',   category: 'group_sessions_run',   twoParty: true },
  { table: 'group_coaching_enrolments',      column: 'athlete_id', category: 'group_sessions_attended', twoParty: true },

  // Squads
  { table: 'squad_members',                  column: 'user_id',    category: 'squad_memberships' },
  { table: 'squad_feed',                     column: 'user_id',    category: 'squad_posts' },
  { table: 'squad_feed_reactions',           column: 'user_id',    category: 'squad_reactions' },
]
