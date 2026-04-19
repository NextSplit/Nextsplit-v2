# NextSplit v2 — Dev Session Handoff
_Last updated: end of session 5 (Phase 7 complete)_

## ⚠️ START OF SESSION CHECKLIST
1. Ask the user: **"Please share your GitHub token so I can clone the repo"**
2. Clone: `git clone https://ghp_TOKEN@github.com/NextSplit/Nextsplit-v2.git nextsplit-v2`
3. `cd nextsplit-v2 && npm install`
4. Read this file fully before touching any code

---

## Repo
- GitHub: https://github.com/NextSplit/Nextsplit-v2
- Live: https://nextsplit-v2.vercel.app

## Deploy instructions
**Auto-deploy is broken on Hobby plan. Never trigger the deploy hook yourself.**
- Push to `main` with `git push origin main`
- Tell the user to open this URL in their browser to trigger deploy:
  `https://api.vercel.com/v1/integrations/deploy/prj_pEA372Qu7gpT6SbskQbeuveYZ9Ri/onqfsTdnji`
- Never open that URL yourself

## Git log (latest first)
```
bb8fbeb  Phase 7: premium framework (ProGate, useSubscription, feature flags, AI rate limiter)
c7dff34  docs: update HANDOFF-2.md after Phase 6
e127022  Phase 6: PB auto-pace, Sunday week fix, post-completion re-engagement, LogModal dirty-check
e55f308  fix: 8-item audit sprint (8 bugs)
699109b  fix: PWA install button
a4f0146  Phase 5C: PWA
5511fab  dark mode toggle all tabs
036cbf1  fix: dark mode CSS
bf6c56c  Phase 5B: Strava
f4c10b7  Phase 5A: onboarding polish
5a202cb  Phase 4: PB history, dark mode, accessibility
589e7e6  Phase 3: share card, push notifications, plan completion
55aeb73  Phase 2: fuel card, AI brief, adaptive suggestions
4c55fd0  Phase 1: settings, plan history, units/dark mode
68d68f1  Phase 0: CSS tokens, Toast, ErrorBoundary
```

## Phases complete
- Phase 0–5C ✅ (see previous handoffs)
- Audit Fix Sprint ✅ 8 bugs fixed
- Phase 6 ✅ PB auto-pace, Sunday week fix, post-completion re-engagement, LogModal dirty-check
- Phase 7 ✅ Premium framework + AI rate limiting

## Phase 7 — what was built (commit bb8fbeb)

### New files
| File | Purpose |
|---|---|
| `src/lib/features.ts` | Single source of truth — all feature keys, tier requirements, rate limits. **Edit here to move features behind/off paywall** |
| `src/hooks/useSubscription.ts` | React hook — reads `subscriptions` table, exposes `isPro`, `canUseFeature(key)`, `isDevMode` |
| `src/components/ProGate.tsx` | Wraps any feature — passes through in dev mode, shows upgrade prompt when enforced |
| `src/lib/aiRateLimit.ts` | Server-side per-user daily AI call counter using `ai_usage` Supabase table |

### How the premium framework works
- `NEXT_PUBLIC_PREMIUM_ENFORCED=false` (current) → all gates open, all features available
- `NEXT_PUBLIC_PREMIUM_ENFORCED=true` → tiers enforced, ProGate shows upgrade prompts
- To move any feature behind paywall: change its tier in `FEATURE_TIERS` in `src/lib/features.ts`
- ProGate usage: `<ProGate feature="ai_coaching_card"><CoachingCard /></ProGate>`
- ProGate preview mode: `<ProGate feature="pace_trends" preview><PaceTrend /></ProGate>` (blurred with upgrade badge)
- Silent gate: `<ProGate feature="acwr_chart" fallback={null}><ACWRChart /></ProGate>`

### AI rate limiter
- Checks `ai_usage` table (per user per day) before every AI call
- In dev mode: 5 calls/user/day (prevents runaway costs during testing)
- In prod mode: uses `AI_RATE_LIMITS` per tier (free=0, pro=10, coach=25)
- Returns 429 with `rateLimited: true` if exceeded — all AI components already handle this gracefully
- **Requires `ai_usage` table in Supabase** — SQL below. Until created, rate limiter fails open (allows all calls)

### Supabase tables to create (for full Phase 7)
Run these in Supabase SQL editor:

```sql
-- AI usage tracking
CREATE TABLE ai_usage (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES auth.users NOT NULL,
  date        date NOT NULL DEFAULT CURRENT_DATE,
  call_count  integer NOT NULL DEFAULT 1,
  tokens_in   integer NOT NULL DEFAULT 0,
  tokens_out  integer NOT NULL DEFAULT 0,
  UNIQUE (user_id, date)
);
ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own usage" ON ai_usage FOR SELECT USING (auth.uid() = user_id);

-- Subscriptions (skeleton — populate when Stripe is wired)
CREATE TABLE subscriptions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid REFERENCES auth.users NOT NULL UNIQUE,
  tier                text NOT NULL DEFAULT 'free' CHECK (tier IN ('free','pro','coach')),
  status              text NOT NULL DEFAULT 'none' CHECK (status IN ('active','trialing','cancelled','expired','none')),
  stripe_customer_id  text,
  stripe_sub_id       text,
  current_period_end  timestamptz,
  trial_end           timestamptz,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own subscription" ON subscriptions FOR SELECT USING (auth.uid() = user_id);

-- Helper function for token usage increment
CREATE OR REPLACE FUNCTION increment_token_usage(
  p_user_id uuid, p_date date, p_tokens_in integer, p_tokens_out integer
) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE ai_usage
  SET tokens_in = tokens_in + p_tokens_in, tokens_out = tokens_out + p_tokens_out
  WHERE user_id = p_user_id AND date = p_date;
END;
$$;
```

### To activate AI features
1. Add `ANTHROPIC_API_KEY` to Vercel env vars (console.anthropic.com → API Keys)
2. Set spend limit of $20/month in Anthropic Console → Settings → Limits
3. Add `NEXT_PUBLIC_PREMIUM_ENFORCED=false` to Vercel env (already false by default, but make it explicit)
4. Run the Supabase SQL above to create `ai_usage` and `subscriptions` tables
5. Deploy — AI features will be live for all users within the 5 calls/day dev limit

## Vercel env vars needed
| Var | Status | Notes |
|---|---|---|
| NEXT_PUBLIC_SUPABASE_URL | ✅ | |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | ✅ | |
| NEXT_PUBLIC_SITE_URL | ✅ | |
| NEXT_PUBLIC_VAPID_PUBLIC_KEY | ✅ | |
| VAPID_PRIVATE_KEY | ✅ | |
| VAPID_EMAIL | ✅ | |
| CRON_SECRET | ✅ | |
| ANTHROPIC_API_KEY | ❌ | Add to unlock AI features |
| NEXT_PUBLIC_PREMIUM_ENFORCED | ❌ | Add as `false` explicitly |
| STRAVA_CLIENT_ID | ❌ | Phase 8 |
| STRAVA_CLIENT_SECRET | ❌ | Phase 8 |
| SUPABASE_SERVICE_ROLE_KEY | ❌ | Needed for server-side rate limiter (uses anon key as fallback) |

## Next phases

### Phase 8 — Strava full activation
1. Create app at https://developers.strava.com
2. Set redirect URI: `https://nextsplit-v2.vercel.app/auth/strava/callback`
3. Add `STRAVA_CLIENT_ID` + `STRAVA_CLIENT_SECRET` to Vercel
4. Test connect → sync → splits → disconnect flow

### Phase 9 — Data depth
- Body weight trending (data in `wellness_logs.weight_kg`, not in Stats)
- Sleep score trending (data in `wellness_logs.sleep`, not in Stats)
- Weekly email digest (needs Resend or similar)
- Race predictor improvement using Riegel formula + actual PBs

### Phase 10 — Social
- Garmin/Wahoo FIT file export
- Leaderboard / friend challenges

### Phase 11 — Monetisation (flip the switch)
Steps when ready to charge:
1. Set `NEXT_PUBLIC_PREMIUM_ENFORCED=true` in Vercel
2. Create Stripe account + products (Pro monthly, Pro annual)
3. Build `/api/stripe/webhook` to write to `subscriptions` table
4. Build `/settings?tab=subscription` upgrade page (ProGate already links here)
5. All gates activate automatically — no other code changes needed

## Key files
- Feature flags:    src/lib/features.ts  ← edit this to change what's behind paywall
- Subscription:     src/hooks/useSubscription.ts
- Gate component:   src/components/ProGate.tsx
- AI rate limiter:  src/lib/aiRateLimit.ts
- AI coach route:   src/app/api/ai/coach/route.ts
- AI recommend:     src/app/api/ai/recommend/route.ts
- Today:            src/app/today/TodayClient.tsx
- Stats:            src/app/dashboard/StatsClient.tsx
- Plan:             src/app/plan/PlanClient.tsx
- Profile:          src/app/profile/ProfileClient.tsx
- Settings:         src/app/settings/SettingsClient.tsx

## Architecture notes
- Supabase backend (9 tables + 2 new tables for Phase 7), Next.js 16 App Router
- Dark mode: localStorage + `.dark` on `<html>`
- Units: localStorage `nextsplit_units`, `useUnits()` hook
- PWA: `/public/sw.js`, ServiceWorkerRegistrar, PWAInstallPrompt
- Premium: `NEXT_PUBLIC_PREMIUM_ENFORCED` env var — false = dev mode, all open
- AI rate limit: `ai_usage` Supabase table, 5 calls/day/user in dev mode
- Strava connection: localStorage `nextsplit_strava_connected`
- Plan completion: localStorage `nextsplit_plan_completed`

## Build commands
```bash
cd nextsplit-v2
npm install
node_modules/.bin/next build   # verify before pushing
git add -A && git commit -m "message"
git push origin main
# Tell user to open deploy hook URL in browser
```
