# NextSplit v2 — Dev Session Handoff
_Last updated: end of session 8 (Phase 8 Strava complete)_

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
7b59ac9  fix: Strava — useEffect for connection check, env var for client ID
36231bc  Phase 8: Strava — connect toast, athlete name, manual sync, last sync time
5cf8235  docs: update HANDOFF-2 after Phase 9
6a53e16  Phase 9: rich wellness dashboard, weight trend, multi-distance race predictor
903094c  docs: HANDOFF-2 — AI confirmed live
df20998  docs: update HANDOFF-2 after Phase 7
bb8fbeb  Phase 7: premium framework + AI rate limiting
e127022  Phase 6: PB auto-pace, Sunday week fix, re-engagement, dirty-check
e55f308  fix: 8-item audit sprint
a4f0146  Phase 5C: PWA
bf6c56c  Phase 5B: Strava core
f4c10b7  Phase 5A: onboarding polish
5a202cb  Phase 4: PB history, dark mode, accessibility
589e7e6  Phase 3: share card, push notifications, plan completion
55aeb73  Phase 2: fuel card, AI brief, adaptive suggestions
4c55fd0  Phase 1: settings, plan history, units/dark mode
68d68f1  Phase 0: CSS tokens, Toast, ErrorBoundary
```

## Phases complete
- Phase 0–5C ✅
- Audit Fix Sprint ✅
- Phase 6 ✅ PB auto-pace, Sunday week fix, re-engagement, dirty-check
- Phase 7 ✅ Premium framework + AI rate limiting (AI live ✅)
- Phase 8 ✅ Strava full activation
- Phase 9 ✅ Wellness dashboard, weight trend, race predictor

## Phase 8 — what was built (commits 36231bc + 7b59ac9)

### Strava connect flow (fully working)
- OAuth connect via Strava developer app (client ID from `NEXT_PUBLIC_STRAVA_CLIENT_ID`)
- Token exchange + storage in `strava_connections` table ✅
- Auto token refresh on expiry ✅
- Athlete name passed through OAuth redirect → stored in localStorage → shown in profile

### Profile page improvements
- **Connection toast** — shows "✓ Strava connected as [Name]!" after OAuth success, error messages on failure/cancel
- **Athlete name** displayed under Strava logo when connected
- **"Check for activities" button** — manual sync trigger in profile, shows count of found activities
- **Last sync time** — shown in the Strava section subtitle
- **Clean disconnect** — clears all localStorage flags on disconnect

### Bug fixes
- `StravaSyncButton` was using `useState` as a side-effect (wrong) — fixed to `useEffect`
- `stravaClientId` was reading from a localStorage key that was never written — now reads from `process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID` directly

### End-to-end flow
1. User goes to Profile → Me tab → Strava section → "Connect Strava"
2. Redirects to Strava OAuth with correct client ID and callback URL
3. Strava redirects back to `/auth/strava/callback`
4. Callback exchanges code for tokens, saves to `strava_connections`, redirects to `/profile?strava=connected&athlete=Name`
5. Profile shows success toast, athlete name appears in Strava section
6. Today tab → run session → Strava button appears → tap → fetches recent activities → import modal
7. Activity imported with splits, pace, HR into training_logs

## Vercel env vars — current status
| Var | Status | Notes |
|---|---|---|
| NEXT_PUBLIC_SUPABASE_URL | ✅ | |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | ✅ | |
| NEXT_PUBLIC_SITE_URL | ✅ | |
| NEXT_PUBLIC_VAPID_PUBLIC_KEY | ✅ | |
| VAPID_PRIVATE_KEY | ✅ | |
| VAPID_EMAIL | ✅ | |
| CRON_SECRET | ✅ | |
| ANTHROPIC_API_KEY | ✅ | AI live |
| NEXT_PUBLIC_PREMIUM_ENFORCED | ✅ | false |
| STRAVA_CLIENT_ID | ✅ | Server-side token exchange |
| NEXT_PUBLIC_STRAVA_CLIENT_ID | ✅ | Client-side connect URL |
| STRAVA_CLIENT_SECRET | ✅ | Server-side token exchange |
| SUPABASE_SERVICE_ROLE_KEY | ❌ | Optional — AI rate limiter uses anon key fallback |

## Supabase tables to create (optional but recommended)
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

-- Subscriptions skeleton (for Phase 11 monetisation)
CREATE TABLE subscriptions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid REFERENCES auth.users NOT NULL UNIQUE,
  tier                text NOT NULL DEFAULT 'free',
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

### Phase 10 — Social & sharing
- Weekly email digest (needs Resend/Postmark — ~$0/month for low volume)
- Garmin/Wahoo FIT file export
- Share card: verify canvas render on Safari/iOS
- Friend challenges / leaderboard (new tables needed)

### Phase 11 — Monetisation (flip the switch)
When ready to charge:
1. Set `NEXT_PUBLIC_PREMIUM_ENFORCED=true` in Vercel
2. Create Stripe account + products (Pro monthly £4.99, Pro annual £39.99)
3. Build `/api/stripe/webhook` → writes to `subscriptions` table
4. Build `/settings?tab=subscription` upgrade page (ProGate already links here)
5. All gates activate automatically — no other code changes needed

### Phase 12 — Performance & architecture
- Shared PlanContext so `useActivePlan()` fetches once per session
- Split TodayClient (~700 lines) into sub-components with React.memo
- Add Suspense boundaries for progressive loading

## Premium framework — how to use
Edit `src/lib/features.ts` to change what's gated:
- `<ProGate feature="ai_coaching_card"><CoachingCard /></ProGate>`
- `<ProGate feature="pace_trends" preview><PaceTrend /></ProGate>` (blurred preview)
- `<ProGate feature="acwr_chart" fallback={null}><ACWRChart /></ProGate>` (silent)
- Currently `NEXT_PUBLIC_PREMIUM_ENFORCED=false` — all gates open

## Key files
- Feature flags:      src/lib/features.ts
- Subscription hook:  src/hooks/useSubscription.ts
- Gate component:     src/components/ProGate.tsx
- AI rate limiter:    src/lib/aiRateLimit.ts
- Strava callback:    src/app/auth/strava/callback/route.ts
- Strava sync API:    src/app/api/strava/sync/route.ts
- Strava disconnect:  src/app/api/strava/disconnect/route.ts
- Strava button:      src/components/StravaSyncButton.tsx
- Profile (Strava UI): src/app/profile/ProfileClient.tsx
- Stats:              src/app/dashboard/StatsClient.tsx
- Today:              src/app/today/TodayClient.tsx
- Plan:               src/app/plan/PlanClient.tsx
- Wellness check-in:  src/components/WellnessCheckIn.tsx

## Architecture notes
- Supabase backend (9 tables), Next.js 16 App Router
- Dark mode: localStorage + `.dark` on `<html>`
- Units: localStorage `nextsplit_units`, `useUnits()` hook
- PWA: `/public/sw.js`, ServiceWorkerRegistrar, PWAInstallPrompt
- Premium: `NEXT_PUBLIC_PREMIUM_ENFORCED` — false = all open
- AI rate limit: 5 calls/user/day dev mode, `ai_usage` table (fails open if missing)
- Strava: `nextsplit_strava_connected` + `nextsplit_strava_athlete` in localStorage
- Plan completion: `nextsplit_plan_completed` in localStorage
- Weight trend: via WellnessCheckIn optional field → `wellness_logs.weight_kg`

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
