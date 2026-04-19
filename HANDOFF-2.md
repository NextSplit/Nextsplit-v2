# NextSplit v2 — Dev Session Handoff
_Last updated: end of session 7 (Phase 9 complete)_

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
6a53e16  Phase 9: rich wellness dashboard, weight trend, multi-distance race predictor
903094c  docs: HANDOFF-2 — AI confirmed live
df20998  docs: update HANDOFF-2 after Phase 7
bb8fbeb  Phase 7: premium framework + AI rate limiting
c7dff34  docs: update HANDOFF-2 after Phase 6
e127022  Phase 6: PB auto-pace, Sunday week fix, post-completion re-engagement, LogModal dirty-check
e55f308  fix: 8-item audit sprint
699109b  fix: PWA install button
a4f0146  Phase 5C: PWA
5511fab  dark mode toggle all tabs
bf6c56c  Phase 5B: Strava
f4c10b7  Phase 5A: onboarding polish
5a202cb  Phase 4: PB history, dark mode, accessibility
589e7e6  Phase 3: share card, push notifications, plan completion
55aeb73  Phase 2: fuel card, AI brief, adaptive suggestions
4c55fd0  Phase 1: settings, plan history, units/dark mode
68d68f1  Phase 0: CSS tokens, Toast, ErrorBoundary
```

## Phases complete
- Phase 0–5C ✅
- Audit Fix Sprint ✅ 8 bugs fixed
- Phase 6 ✅ PB auto-pace, Sunday week fix, re-engagement, LogModal dirty-check
- Phase 7 ✅ Premium framework (ProGate, useSubscription, feature flags, AI rate limiter)
- AI live ✅ ANTHROPIC_API_KEY + NEXT_PUBLIC_PREMIUM_ENFORCED=false confirmed in Vercel
- Phase 9 ✅ Data depth — wellness dashboard, weight trend, race predictor

## Phase 9 — what was built (commit 6a53e16)

### Enhanced WellnessTrend (Stats tab)
- Now shows **14 days** instead of 7
- **4-metric tabs**: Readiness, Sleep, Freshness (inverted soreness), Mood
- **Sparkline** colour-coded by score range (green/amber/red)
- **Weekly averages** row — last 4 weeks at a glance
- **Breakdown panel** on Readiness tab: today's sleep/freshness/mood progress bars
- Trend badge shows delta vs start of period

### WeightTrend (new component, Stats tab)
- SVG line chart with trend line (linear regression)
- Shows all weight entries from last 28 days
- Delta badge (kg gained/lost vs oldest entry)
- Only renders if user has ≥2 weight entries — stays hidden until populated
- Added directly below WellnessTrend in Stats tab render order

### Weight logging in WellnessCheckIn (Today tab)
- Optional ⚖️ weight field added to morning check-in form
- Saves `weight_kg` to `wellness_logs` table on submit
- Users can now build up the weight trend data through daily check-ins

### Multi-distance race predictor (Stats tab)
- Now shows **all 4 distances** (5K, 10K, Half, Marathon) simultaneously
- Highlights the user's goal distance (detected from plan name/goal field)
- Confidence level shown per distance (high/medium/low)
- Basis label shows which logged run the prediction is derived from
- Falls back gracefully if not enough data for a distance
- Only shows distances where a prediction is possible

## Vercel env vars
| Var | Status | Notes |
|---|---|---|
| NEXT_PUBLIC_SUPABASE_URL | ✅ | |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | ✅ | |
| NEXT_PUBLIC_SITE_URL | ✅ | |
| NEXT_PUBLIC_VAPID_PUBLIC_KEY | ✅ | |
| VAPID_PRIVATE_KEY | ✅ | |
| VAPID_EMAIL | ✅ | |
| CRON_SECRET | ✅ | |
| ANTHROPIC_API_KEY | ✅ | Confirmed working |
| NEXT_PUBLIC_PREMIUM_ENFORCED | ✅ | Set to false |
| STRAVA_CLIENT_ID | ❌ | Phase 8 |
| STRAVA_CLIENT_SECRET | ❌ | Phase 8 |
| SUPABASE_SERVICE_ROLE_KEY | ❌ | Needed for server-side AI rate limiter (uses anon key as fallback) |

## Supabase tables still to create (optional but recommended)
Run in Supabase SQL editor when ready:

```sql
-- AI usage tracking (rate limiter works without this, just fails open)
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

-- Subscriptions skeleton (needed for Phase 11 monetisation)
CREATE TABLE subscriptions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid REFERENCES auth.users NOT NULL UNIQUE,
  tier                text NOT NULL DEFAULT 'free' CHECK (tier IN ('free','pro','coach')),
  status              text NOT NULL DEFAULT 'none',
  stripe_customer_id  text,
  stripe_sub_id       text,
  current_period_end  timestamptz,
  trial_end           timestamptz,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own subscription" ON subscriptions FOR SELECT USING (auth.uid() = user_id);
```

## Next phases — recommended order

### Phase 8 — Strava full activation
Steps needed:
1. Create Strava developer app at https://developers.strava.com
2. Add redirect URI: `https://nextsplit-v2.vercel.app/auth/strava/callback`
3. Add `STRAVA_CLIENT_ID` + `STRAVA_CLIENT_SECRET` to Vercel env vars
4. Test: connect → sync → splits display → disconnect flow
- `nextsplit_strava_connected` localStorage flag already wired — button auto-shows after connect

### Phase 10 — Social & sharing
- Weekly email digest (needs Resend or similar email provider)
- Garmin/Wahoo FIT file export
- Share card: test canvas render on Safari/iOS
- Leaderboard / friend challenges (new Supabase tables needed)

### Phase 11 — Monetisation (flip the switch)
When ready to charge:
1. Set `NEXT_PUBLIC_PREMIUM_ENFORCED=true` in Vercel
2. Create Stripe account + products (Pro monthly £4.99, Pro annual)
3. Build `/api/stripe/webhook` → writes to `subscriptions` table
4. Build `/settings?tab=subscription` upgrade page (ProGate already links here)
5. All gates activate automatically — no other code changes needed

### Phase 12 — Performance & architecture
- Shared PlanContext so `useActivePlan()` fetches once per session (not per tab)
- Split TodayClient (~700 lines) into sub-components with React.memo
- Add Suspense boundaries for progressive loading

## Premium framework — how to use
Everything lives in `src/lib/features.ts`:
- Change a feature's tier from `'free'` to `'pro'` to gate it
- Wrap any component: `<ProGate feature="ai_coaching_card"><CoachingCard /></ProGate>`
- Preview (blurred): `<ProGate feature="pace_trends" preview><PaceTrend /></ProGate>`
- Silent gate: `<ProGate feature="acwr_chart" fallback={null}><ACWRChart /></ProGate>`
- Currently `NEXT_PUBLIC_PREMIUM_ENFORCED=false` — all gates open

## Key files
- Feature flags:     src/lib/features.ts
- Subscription hook: src/hooks/useSubscription.ts
- Gate component:    src/components/ProGate.tsx
- AI rate limiter:   src/lib/aiRateLimit.ts
- Stats (Phase 9):   src/app/dashboard/StatsClient.tsx
- Wellness check-in: src/components/WellnessCheckIn.tsx
- Today:             src/app/today/TodayClient.tsx
- Plan:              src/app/plan/PlanClient.tsx
- Profile:           src/app/profile/ProfileClient.tsx
- Settings:          src/app/settings/SettingsClient.tsx
- AI coach route:    src/app/api/ai/coach/route.ts

## Architecture notes
- Supabase backend (9 tables), Next.js 16 App Router, all tabs are client components
- Dark mode: localStorage + `.dark` on `<html>`, ThemeWrapper applies on mount
- Units: localStorage `nextsplit_units`, `useUnits()` hook + event dispatch
- PWA: `/public/sw.js` registered eagerly, install prompt in PWAInstallPrompt
- Premium: `NEXT_PUBLIC_PREMIUM_ENFORCED` env var — false = all open
- AI rate limit: 5 calls/user/day in dev mode, checks `ai_usage` table (fails open if missing)
- Strava: localStorage `nextsplit_strava_connected`, written by StravaSection
- Plan completion: localStorage `nextsplit_plan_completed`, written by PlanCompletionCeremony
- Weight trend: populated via WellnessCheckIn optional field → `wellness_logs.weight_kg`

## Build commands
```bash
cd nextsplit-v2
npm install
node_modules/.bin/next build   # always verify before pushing
git add -A && git commit -m "message"
git push origin main
# Tell user to open deploy hook URL in browser
```

## Handoff update instructions (for Claude)
After each phase: update this file, commit + push, copy to /mnt/user-data/outputs/, use present_files tool.
