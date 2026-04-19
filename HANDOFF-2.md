# NextSplit v2 — Dev Session Handoff
_Last updated: end of session 11 (Phase UI-2 complete)_

## ⚠️ START OF SESSION CHECKLIST
1. Ask user for GitHub token (reuse from conversation unless told otherwise)
2. Clone or pull: `git clone https://ghp_TOKEN@github.com/NextSplit/Nextsplit-v2.git nextsplit-v2`
3. `cd nextsplit-v2 && npm install`
4. `node_modules/.bin/next build` — confirm clean before touching anything
5. Read the EXACT NEXT STEPS section below before writing any code

---

## Repo
- GitHub: https://github.com/NextSplit/Nextsplit-v2
- Live: https://nextsplit-v2.vercel.app

## Deploy instructions
**Auto-deploy is broken. Never trigger the deploy hook yourself.**
- Push: `git push origin main`
- Tell user to open in browser to deploy:
  `https://api.vercel.com/v1/integrations/deploy/prj_pEA372Qu7gpT6SbskQbeuveYZ9Ri/onqfsTdnji`

## Git log (latest first)
```
133177f  Phase UI-2: session card redesign (accent border, bigger cards), week progress bar, colour tightening
c1bf890  docs: update HANDOFF-2 after Phase UI-1 complete
5513b23  Phase UI-1: Today sessions-first reorder, Coach tab reorder + rename, Character tab reorder + rename + divider
bb432d2  Phase UI-1 (partial): rename Stats→Coach, Me→Character in bottom nav
```

## Phases complete
- Phase 0–9 ✅ Full foundation, AI live, Strava live
- Phase UI-1 ✅ Tab renames, Today reorder, Coach reorder, Character reorder + divider
- Phase UI-2 ✅ Session card redesign, week progress bar, colour tightening

---

## EXACT NEXT STEPS

### What was done in Phase UI-2
- ✅ src/lib/sessionUtils.ts — added accent field to SessionTypeConfig + all 14 session types
- ✅ SessionCard in TodayClient.tsx:
  - Left accent border: border-l-4 + border-t border-r border-b using cfg.accent
  - Min height: min-h-[88px], padding p-4→p-5, icon w-10→w-11
  - Session name: text-sm font-semibold → text-base font-bold
  - Done state: bg-emerald-50/50 → bg-emerald-50 (solid, more visible)
  - Quick-done button: w-9→w-10
- ✅ Week progress bar: W pill → W text + thin teal/emerald fill bar
- ✅ Colour tightening: weekly report + Sunday banner violet/indigo → teal; sleep note indigo → teal

### Phase UI-3a — Character customisation (NEXT)
File: src/app/profile/ProfileClient.tsx + src/lib/rpg.ts

Add cosmetic customisation to the Character tab:
1. Kit colour selector — 6 swatches (teal/orange/red/blue/purple/yellow), localStorage nextsplit_kit_colour
2. Skin tone selector — 5 Fitzpatrick options applied to runner emoji, localStorage nextsplit_skin_tone
3. HeroCard shows kit colour as an accent (coloured ring or badge)
4. Add a small "Customise ✎" button on HeroCard that expands an inline swatch picker

Approach: keep it simple, no modal. Two rows of tappable swatches inline below the hero card when expanded.

### Phase UI-3b — Character states + medals
- Idle / active / celebrating states based on today's session completion
- Medal overlay on HeroCard: streak ≥7 shows bronze, ≥30 silver, plan complete gold
- CSS transition between states

### Phase UI-3c — Unlockable cosmetics (revenue)
- Hat, cape, wings etc gated behind Pro or milestone achievements
- ProGate wrapper on locked items
- "Unlock with Pro — £X/mo" hook

---

## Remaining roadmap
```
Phase UI-3a  🟡  Character customisation (skin/kit colour)     ~3h
Phase UI-3b  ⬜  Character states + medals                     ~3h
Phase UI-3c  ⬜  Unlockable items + challenge system           ~5h
Phase UI-4   ⬜  Fuel platform (TDEE, macros, AI nutrition)    ~8h
Phase UI-5   ⬜  Motion & delight (animations, PB toast)       ~4h
Phase 10     ⬜  Social, email digest, sharing                 ~6h
Phase 11     ⬜  Monetisation — Stripe + Pro tier              ~8h
Phase 12     ⬜  Coach tier + performance                      ~8h
```

---

## Vercel env vars — all set
NEXT_PUBLIC_SUPABASE_URL ✅ | NEXT_PUBLIC_SUPABASE_ANON_KEY ✅ | NEXT_PUBLIC_SITE_URL ✅
ANTHROPIC_API_KEY ✅ | NEXT_PUBLIC_PREMIUM_ENFORCED ✅ false | STRAVA_CLIENT_ID ✅
NEXT_PUBLIC_STRAVA_CLIENT_ID ✅ | STRAVA_CLIENT_SECRET ✅ | NEXT_PUBLIC_VAPID_PUBLIC_KEY ✅
VAPID_PRIVATE_KEY ✅ | VAPID_EMAIL ✅ | CRON_SECRET ✅ | SUPABASE_SERVICE_ROLE_KEY ❌ optional

## Key files
- Session utils:  src/lib/sessionUtils.ts (accent colours)
- Today tab:      src/app/today/TodayClient.tsx
- Coach tab:      src/app/dashboard/StatsClient.tsx
- Character tab:  src/app/profile/ProfileClient.tsx (UI-3 target)
- RPG lib:        src/lib/rpg.ts
- Bottom nav:     src/components/BottomNav.tsx
- Feature flags:  src/lib/features.ts
- ProGate:        src/components/ProGate.tsx

## Colour system (tightened in UI-2)
teal = brand | amber = warnings | emerald = success/done | red = danger only
No violet/indigo/purple in UI components.

## Build + deploy
```bash
cd nextsplit-v2 && npm install
node_modules/.bin/next build
git config user.email "dev@nextsplit.app" && git config user.name "NextSplit Dev"
git add -A && git commit -m "message" && git push origin main
# User opens deploy hook in browser
```
