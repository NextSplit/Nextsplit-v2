/**
 * NextSplit — centralised environment config
 * All process.env access goes through here.
 * Never import process.env directly in components or API routes.
 */

// ── Public (safe to expose to browser) ─────────────────────────────────────
export const config = {
  siteUrl:               process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nextsplit.app',
  supabaseUrl:           process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey:       process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  stripePublishableKey:  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '',
  referralEnabled:       process.env.NEXT_PUBLIC_REFERRAL_ENABLED === 'true',
  posthogKey:            process.env.NEXT_PUBLIC_POSTHOG_KEY ?? '',
  posthogHost:           process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://eu.posthog.com',
  stravaClientId:        process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID ?? '',
  vapidPublicKey:        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '',

  // Stripe price IDs
  stripe: {
    foundingMonthly: process.env.STRIPE_PRICE_FOUNDING_MONTHLY ?? '',
    foundingAnnual:  process.env.STRIPE_PRICE_FOUNDING_ANNUAL  ?? '',
    standardMonthly: process.env.STRIPE_PRICE_STANDARD_MONTHLY ?? '',
    standardAnnual:  process.env.STRIPE_PRICE_STANDARD_ANNUAL  ?? '',
    foundingLimit:   parseInt(process.env.STRIPE_FOUNDING_MEMBER_LIMIT ?? '500', 10),
  },
} as const

// ── Server-only (never exposed to browser) ──────────────────────────────────
// Import these only in API routes and server components
export const serverConfig = {
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  stripeSecretKey:        process.env.STRIPE_SECRET_KEY ?? '',
  stripeWebhookSecret:    process.env.STRIPE_WEBHOOK_SECRET ?? '',
  anthropicApiKey:        process.env.ANTHROPIC_API_KEY ?? '',
  stravaClientSecret:     process.env.STRAVA_CLIENT_SECRET ?? '',
  seedSecret:             process.env.SEED_SECRET ?? '',
  cronSecret:             process.env.CRON_SECRET ?? '',
  vapidPrivateKey:        process.env.VAPID_PRIVATE_KEY ?? '',
  vapidEmail:             process.env.VAPID_EMAIL ?? '',
  resendApiKey:           process.env.RESEND_API_KEY ?? '',
  // P1.3: relocated from public config so the value cannot be inlined into
  // the client bundle. Client code reads effective dev-mode via
  // /api/subscription/dev-mode, which reads this field server-side.
  premiumEnforced:        process.env.PREMIUM_ENFORCED === 'true',
} as const

// ── Type guard — call in server startup to verify critical vars ─────────────
export function assertServerConfig() {
  const required = [
    ['SUPABASE_SERVICE_ROLE_KEY', serverConfig.supabaseServiceRoleKey],
    ['STRIPE_SECRET_KEY',         serverConfig.stripeSecretKey],
    ['STRIPE_WEBHOOK_SECRET',     serverConfig.stripeWebhookSecret],
    ['ANTHROPIC_API_KEY',         serverConfig.anthropicApiKey],
  ] as const

  const missing = required.filter(([, v]) => !v).map(([k]) => k)
  if (missing.length > 0) {
    // Missing env vars detected — check Vercel environment configuration
  }
}
